import { describe, expect, it } from 'vitest';
import type { DataResult } from '../../../data/source';
import { gatewayAdminMoneyService } from './gateway';
import { createMockAdminMoneyService } from './mock';

function data<T>(result: DataResult<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
const errorKind = (result: DataResult<unknown>) => (result.ok ? null : result.error.kind);

async function allLines(service: ReturnType<typeof createMockAdminMoneyService>, id: string) {
  const first = data(await service.getRemittance(id, 1));
  const pages = Math.ceil(first.lines.total / first.lines.pageSize);
  const lines = [...first.lines.items];
  for (let page = 2; page <= pages; page += 1) lines.push(...data(await service.getRemittance(id, page)).lines.items);
  return { detail: first, lines };
}

describe('mock COD remittances', () => {
  it('makes every batch add up: lines to the expected total, received lines to the received total', async () => {
    const service = createMockAdminMoneyService();
    for (const remittance of data(await service.listRemittances())) {
      const { lines } = await allLines(service, remittance.id);
      expect(lines.length, remittance.id).toBe(remittance.lineCount);
      expect(lines.reduce((sum, line) => sum + line.expectedPaise, 0), remittance.id).toBe(remittance.expectedPaise);
      expect(lines.reduce((sum, line) => sum + (line.receivedPaise ?? 0), 0), remittance.id).toBe(remittance.receivedPaise);
      expect(lines.every((line) => line.expectedPaise > 0 && (line.receivedPaise ?? 0) >= 0)).toBe(true);
      expect(new Set(lines.map((line) => line.awb)).size, `${remittance.id} unique AWBs`).toBe(lines.length);
    }
  });

  it('gives a short batch its difference and an exception per mismatched line', async () => {
    const service = createMockAdminMoneyService();
    const { detail, lines } = await allLines(service, 'rem_ek_1105');
    expect(detail.remittance.status).toBe('short');
    expect(detail.remittance.receivedPaise - detail.remittance.expectedPaise).toBe(-210_000);
    expect(lines.filter((line) => line.match === 'mismatch')).toHaveLength(3);
    expect(detail.exceptions.map((entry) => entry.variancePaise).sort((a, b) => a - b)).toEqual([-150_000, -90_000, 30_000]);
  });

  it('answers not_found for an unknown batch', async () => {
    expect(errorKind(await createMockAdminMoneyService().getRemittance('rem_nope', 1))).toBe('not_found');
  });
});

describe('mock reconcileRemittance', () => {
  it('matches the lines, marks a short batch short and opens an exception per mismatch', async () => {
    const service = createMockAdminMoneyService();
    const openBefore = data(await service.listCodExceptions()).filter((entry) => entry.status === 'open').length;

    const result = data(await service.reconcileRemittance('rem_bd_1108'));

    expect(result.remittance.status).toBe('short');
    expect(result.remittance.reconciledAt).not.toBeNull();
    expect(result.mismatched).toBe(1);
    expect(result.matched).toBe(result.remittance.lineCount - 1);
    const { detail, lines } = await allLines(service, 'rem_bd_1108');
    expect(lines.every((line) => line.match === 'matched' || line.match === 'mismatch')).toBe(true);
    expect(detail.exceptions).toMatchObject([{ type: 'amount_mismatch', status: 'open', variancePaise: -45_000 }]);
    expect(data(await service.listCodExceptions()).filter((entry) => entry.status === 'open')).toHaveLength(openBefore + 1);
    expect(data(await service.getSummary()).shortBatches).toBe(2);
  });

  it('marks a fully paid batch reconciled with no exceptions', async () => {
    const service = createMockAdminMoneyService();
    const result = data(await service.reconcileRemittance('rem_dh_1109'));
    expect(result.remittance.status).toBe('reconciled');
    expect(result.mismatched).toBe(0);
  });

  it('refuses to reconcile a batch twice, and leaves it as it was', async () => {
    const service = createMockAdminMoneyService();
    await service.reconcileRemittance('rem_dh_1109');
    const exceptionsBefore = data(await service.listCodExceptions()).length;

    for (const id of ['rem_dh_1109', 'rem_dl_1102']) {
      const again = await service.reconcileRemittance(id);
      expect(errorKind(again), id).toBe('conflict');
      expect(again.ok ? '' : again.error.message).toBe('This batch is already reconciled.');
    }
    expect(data(await service.listCodExceptions())).toHaveLength(exceptionsBefore);
  });

  it('refuses a batch the courier has not paid, and an unknown one', async () => {
    const service = createMockAdminMoneyService();
    expect(errorKind(await service.reconcileRemittance('rem_dl_1112'))).toBe('conflict');
    expect(errorKind(await service.reconcileRemittance('rem_nope'))).toBe('not_found');
  });
});

describe('mock verifyBankTransfer', () => {
  it.each([
    [18_450_000, 'verified', 0],
    [18_000_000, 'short', -450_000],
    [18_460_000, 'surplus', 10_000],
  ] as const)('reads a bank credit of %i paise as %s', async (credit, result, variance) => {
    const service = createMockAdminMoneyService();
    const verification = data(await service.verifyBankTransfer('rem_dl_1102', credit, 'utr123456'));
    expect(verification).toMatchObject({ result, variancePaise: variance, bankCreditPaise: credit, utr: 'utr123456' });
    expect(data(await service.getRemittance('rem_dl_1102', 1)).remittance.bankVerification).toMatchObject({ result });
  });

  it('keeps the batch UTR when none is given', async () => {
    const service = createMockAdminMoneyService();
    expect(data(await service.verifyBankTransfer('rem_ek_1105', 9_610_000, null)).utr).toBe('HDFC0011050098');
  });

  it('refuses an unpaid batch, a bad amount and an unknown batch', async () => {
    const service = createMockAdminMoneyService();
    expect(errorKind(await service.verifyBankTransfer('rem_sf_1110', 100, null))).toBe('conflict');
    expect(errorKind(await service.verifyBankTransfer('rem_dl_1102', 0, null))).toBe('validation');
    expect(errorKind(await service.verifyBankTransfer('rem_dl_1102', 1.5, null))).toBe('validation');
    expect(errorKind(await service.verifyBankTransfer('rem_nope', 100, null))).toBe('not_found');
  });
});

describe('mock COD exceptions', () => {
  it('lists open exceptions first', async () => {
    const list = data(await createMockAdminMoneyService().listCodExceptions());
    const firstClosed = list.findIndex((entry) => entry.status !== 'open');
    expect(firstClosed).toBeGreaterThan(0);
    expect(list.slice(firstClosed).every((entry) => entry.status !== 'open')).toBe(true);
  });

  it('closes an open exception with its reason, once', async () => {
    const service = createMockAdminMoneyService();
    const open = data(await service.listCodExceptions()).find((entry) => entry.status === 'open')!;

    const closed = data(await service.resolveCodException(open.id, 'written_off', '  Customer   refused part of the COD '));
    expect(closed).toMatchObject({ status: 'written_off', resolution: { note: 'Customer refused part of the COD' } });
    expect(errorKind(await service.resolveCodException(open.id, 'resolved', 'Second try'))).toBe('conflict');
  });

  it('refuses a missing reason, a bad type and an unknown exception', async () => {
    const service = createMockAdminMoneyService();
    const open = data(await service.listCodExceptions()).find((entry) => entry.status === 'open')!;
    expect(errorKind(await service.resolveCodException(open.id, 'resolved', ' ok '))).toBe('validation');
    expect(errorKind(await service.resolveCodException(open.id, 'ignored' as never, 'Long enough'))).toBe('validation');
    expect(errorKind(await service.resolveCodException('exc_999', 'resolved', 'Long enough'))).toBe('not_found');
    expect(data(await service.listCodExceptions()).find((entry) => entry.id === open.id)!.status).toBe('open');
  });
});

describe('mock overdue remittances', () => {
  it('lists unpaid batches past their due date only', async () => {
    const overdue = data(await createMockAdminMoneyService().listOverdueRemittances());
    // Shadowfax pays within 5 days; its batch ended 11 days ago. The others are paid or not due yet.
    expect(overdue).toEqual([expect.objectContaining({ batchId: 'rem_sf_1101', carrier: 'shadowfax', daysOverdue: 6 })]);
  });
});

describe('gateway COD service', () => {
  it('says every COD call is not available yet', async () => {
    for (const result of [
      await gatewayAdminMoneyService.getRemittance('rem_dl_1102', 1),
      await gatewayAdminMoneyService.reconcileRemittance('rem_dl_1102'),
      await gatewayAdminMoneyService.verifyBankTransfer('rem_dl_1102', 100, null),
      await gatewayAdminMoneyService.listCodExceptions(),
      await gatewayAdminMoneyService.resolveCodException('exc_001', 'resolved', 'Long enough'),
      await gatewayAdminMoneyService.listOverdueRemittances(),
    ]) {
      expect(errorKind(result)).toBe('unavailable');
    }
  });
});
