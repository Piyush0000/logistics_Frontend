'use server';

import { revalidatePath } from 'next/cache';
import type { ApiError } from '@/lib/gateway/errors';
import { adminMoneyService } from '@/lib/admin/data/money';
import { parseBankCredit, parseUtr, validateResolution } from '@/lib/admin/data/money/cod-rules';
import { recordAudit } from '@/lib/admin/data/system';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise } from '@/lib/format/money';

export type CodActionState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: Record<string, string>; message: string | null }
  | { status: 'saved'; message: string };

const MAX_FIELD = 1000;
const field = (form: FormData, name: string) => String(form.get(name) ?? '').slice(0, MAX_FIELD);

function failed(error: ApiError, what: string): CodActionState {
  return { status: 'invalid', errors: {}, message: error.kind === 'not_found' ? `That ${what} does not exist.` : error.message };
}

function refresh() {
  revalidatePath('/admin/money', 'layout');
  revalidatePath('/admin/system');
}

/** Mirrors the reconciliation service's reconcile route, then audits it. */
export async function reconcileRemittanceAction(_previous: CodActionState, form: FormData): Promise<CodActionState> {
  await requireAdminSession();
  const id = field(form, 'id');

  const result = await adminMoneyService().reconcileRemittance(id);
  if (!result.ok) return failed(result.error, 'batch');

  const { remittance, matched, mismatched } = result.data;
  await recordAudit({
    action: 'COD reconciled',
    target: `${remittance.carrier} · ${remittance.id}`,
    detail: `${matched} lines matched, ${mismatched} mismatched. Received ${formatPaise(remittance.receivedPaise)} of ${formatPaise(remittance.expectedPaise)}.`,
  });
  refresh();
  return {
    status: 'saved',
    message:
      mismatched === 0
        ? `Reconciled. All ${matched} lines matched.`
        : `Reconciled. ${matched} lines matched, ${mismatched} did not; ${mismatched === 1 ? 'an exception was' : 'exceptions were'} opened.`,
  };
}

const VERIFY_LABEL = { verified: 'verified', short: 'short', surplus: 'surplus' } as const;

/** Mirrors the reconciliation service's verify-bank route, then audits it. */
export async function verifyBankAction(_previous: CodActionState, form: FormData): Promise<CodActionState> {
  await requireAdminSession();
  const credit = parseBankCredit(field(form, 'credit'));
  const utr = parseUtr(field(form, 'utr'));
  const errors: Record<string, string> = {};
  if (!credit.ok) errors.credit = credit.message;
  if (!utr.ok) errors.utr = utr.message;
  if (!credit.ok || !utr.ok) return { status: 'invalid', errors, message: null };

  const id = field(form, 'id');
  const result = await adminMoneyService().verifyBankTransfer(id, credit.paise, utr.utr);
  if (!result.ok) return failed(result.error, 'batch');

  const { result: outcome, variancePaise, utr: usedUtr } = result.data;
  const summary =
    outcome === 'verified'
      ? 'matches the lines total'
      : outcome === 'short'
        ? `is short by ${formatPaise(-variancePaise)}`
        : `is ${formatPaise(variancePaise)} more than the lines total`;
  await recordAudit({
    action: 'COD bank verified',
    target: id,
    detail: `Bank credit ${formatPaise(credit.paise)}${usedUtr ? ` (UTR ${usedUtr})` : ''}: ${VERIFY_LABEL[outcome]}.`,
  });
  refresh();
  return { status: 'saved', message: `Saved. The bank credit of ${formatPaise(credit.paise)} ${summary}.` };
}

/** Mirrors the reconciliation service's resolve route, then audits it. */
export async function resolveExceptionAction(_previous: CodActionState, form: FormData): Promise<CodActionState> {
  await requireAdminSession();
  const checked = validateResolution({ resolution: field(form, 'resolution'), note: field(form, 'note') });
  if (!checked.ok) return { status: 'invalid', errors: checked.errors, message: null };

  const result = await adminMoneyService().resolveCodException(field(form, 'id'), checked.value.resolution, checked.value.note);
  if (!result.ok) return failed(result.error, 'exception');

  const entry = result.data;
  const written = checked.value.resolution === 'written_off';
  await recordAudit({
    action: written ? 'COD exception written off' : 'COD exception resolved',
    target: `${entry.awb} · ${entry.batchId}`,
    detail: `Difference ${formatPaise(entry.variancePaise)}. ${checked.value.note}`,
  });
  refresh();
  return { status: 'saved', message: written ? 'Written off.' : 'Resolved.' };
}
