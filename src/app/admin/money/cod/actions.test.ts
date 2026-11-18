import { beforeEach, describe, expect, it, vi } from 'vitest';

const signedIn = vi.hoisted(() => ({ current: true }));
const audit = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/admin/session', () => ({
  requireAdminSession: async () => {
    if (!signedIn.current) throw new Error('redirect:/admin/login');
    return { email: 'admin@evocships.test' };
  },
}));
vi.mock('@/lib/admin/data/system', () => ({ recordAudit: audit }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { adminMoneyService } from '@/lib/admin/data/money';
import { BANK_CREDIT_RANGE_MESSAGE, NOTE_MESSAGE, UTR_MESSAGE } from '@/lib/admin/data/money/cod-rules';
import { reconcileRemittanceAction, resolveExceptionAction, verifyBankAction, type CodActionState } from './actions';

const IDLE: CodActionState = { status: 'idle' };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function remittance(id: string) {
  const result = await adminMoneyService().getRemittance(id, 1);
  if (!result.ok) throw new Error(result.error.message);
  return result.data.remittance;
}

async function firstOpenException() {
  const result = await adminMoneyService().listCodExceptions();
  if (!result.ok) throw new Error(result.error.message);
  return result.data.find((entry) => entry.status === 'open')!;
}

beforeEach(() => {
  signedIn.current = true;
  audit.mockClear();
  delete (globalThis as { evocMockAdminMoney?: unknown }).evocMockAdminMoney;
});

describe('reconcileRemittanceAction', () => {
  it('refuses a signed-out caller', async () => {
    signedIn.current = false;
    await expect(reconcileRemittanceAction(IDLE, form({ id: 'rem_bd_1108' }))).rejects.toThrow('redirect:/admin/login');
    expect((await remittance('rem_bd_1108')).reconciledAt).toBeNull();
  });

  it('reconciles once, audits it, and refuses the second time', async () => {
    const first = await reconcileRemittanceAction(IDLE, form({ id: 'rem_bd_1108' }));
    expect(first).toMatchObject({ status: 'saved', message: expect.stringContaining('1 did not') });
    expect(audit).toHaveBeenCalledWith({
      action: 'COD reconciled',
      target: 'bluedart · rem_bd_1108',
      detail: expect.stringContaining('1 mismatched. Received ₹62,550.00 of ₹63,000.00.'),
    });

    audit.mockClear();
    expect(await reconcileRemittanceAction(IDLE, form({ id: 'rem_bd_1108' }))).toEqual({
      status: 'invalid',
      errors: {},
      message: 'This batch is already reconciled.',
    });
    expect(audit).not.toHaveBeenCalled();
  });

  it('refuses an unknown batch', async () => {
    expect(await reconcileRemittanceAction(IDLE, form({ id: 'rem_nope' }))).toMatchObject({ message: 'That batch does not exist.' });
  });
});

describe('verifyBankAction', () => {
  it('saves a short bank credit and audits it with the UTR', async () => {
    const state = await verifyBankAction(IDLE, form({ id: 'rem_ek_1105', credit: '95,000', utr: 'hdfc0011050098' }));
    expect(state).toEqual({ status: 'saved', message: 'Saved. The bank credit of ₹95,000.00 is short by ₹1,100.00.' });
    expect((await remittance('rem_ek_1105')).bankVerification).toMatchObject({ result: 'short', variancePaise: -110_000 });
    expect(audit).toHaveBeenCalledWith({
      action: 'COD bank verified',
      target: 'rem_ek_1105',
      detail: 'Bank credit ₹95,000.00 (UTR HDFC0011050098): short.',
    });
  });

  it.each([
    [{ credit: '0', utr: '' }, { credit: BANK_CREDIT_RANGE_MESSAGE }],
    [{ credit: '100.001', utr: '' }, { credit: BANK_CREDIT_RANGE_MESSAGE }],
    [{ credit: '100', utr: 'bad utr!' }, { utr: UTR_MESSAGE }],
  ])('rejects %j on the server', async (values, errors) => {
    expect(await verifyBankAction(IDLE, form({ id: 'rem_ek_1105', ...values }))).toEqual({ status: 'invalid', errors, message: null });
    expect(audit).not.toHaveBeenCalled();
  });

  it('refuses a batch the courier has not paid', async () => {
    const state = await verifyBankAction(IDLE, form({ id: 'rem_dl_1112', credit: '100', utr: '' }));
    expect(state).toMatchObject({ status: 'invalid', message: 'The courier has not paid this batch yet.' });
  });
});

describe('resolveExceptionAction', () => {
  it('closes an exception with a reason and audits it', async () => {
    const open = await firstOpenException();
    const state = await resolveExceptionAction(IDLE, form({ id: open.id, resolution: 'written_off', note: 'Customer refused part of the COD' }));
    expect(state).toEqual({ status: 'saved', message: 'Written off.' });
    expect(audit).toHaveBeenCalledWith({
      action: 'COD exception written off',
      target: `${open.awb} · ${open.batchId}`,
      detail: `Difference ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(open.variancePaise / 100)}. Customer refused part of the COD`,
    });
    expect(await resolveExceptionAction(IDLE, form({ id: open.id, resolution: 'resolved', note: 'Second try' }))).toMatchObject({
      message: 'This exception is already closed.',
    });
  });

  it('requires a reason of 5 to 300 characters', async () => {
    const open = await firstOpenException();
    expect(await resolveExceptionAction(IDLE, form({ id: open.id, resolution: 'resolved', note: 'ok' }))).toEqual({
      status: 'invalid',
      errors: { note: NOTE_MESSAGE },
      message: null,
    });
    expect(audit).not.toHaveBeenCalled();
  });
});
