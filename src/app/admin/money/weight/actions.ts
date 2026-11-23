'use server';

import { revalidatePath } from 'next/cache';
import { recordAudit } from '@/lib/admin/data/system';
import { adminWeightService } from '@/lib/admin/data/weight';
import { parseWeightCsv, validateResolutionNote, WEIGHT_CARRIERS } from '@/lib/admin/data/weight-rules';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise } from '@/lib/format/money';
import type { CodActionState } from '../cod/actions';

const MAX_FIELD = 1000;
const MAX_FILE_BYTES = 1024 * 1024;
const field = (form: FormData, name: string) => String(form.get(name) ?? '').slice(0, MAX_FIELD);

/** Uploads a courier's weight file: each heavier, known shipment becomes a charge the merchant answers. */
export async function recordWeightsAction(_previous: CodActionState, form: FormData): Promise<CodActionState> {
  await requireAdminSession();
  const errors: Record<string, string> = {};
  const carrier = field(form, 'carrier');
  if (!WEIGHT_CARRIERS.some((c) => c.value === carrier)) errors.carrier = 'Choose the courier.';
  const file = form.get('file');
  let lines: ReturnType<typeof parseWeightCsv> | null = null;
  if (!(file instanceof File) || file.size === 0) errors.file = "Choose the courier's weight file (CSV).";
  else if (file.size > MAX_FILE_BYTES) errors.file = 'The file is larger than 1 MB.';
  else {
    lines = parseWeightCsv(await file.text());
    if (!lines.ok) errors.file = lines.message;
  }
  if (Object.keys(errors).length > 0 || !lines?.ok) return { status: 'invalid', errors, message: null };

  const result = await adminWeightService().record(carrier, lines.lines);
  if (!result.ok) return { status: 'invalid', errors: {}, message: result.error.message };

  const { created, duplicates, notHeavier, unknownCount, unknown } = result.data;
  const total = lines.lines.reduce((sum, l) => sum + l.extraChargePaise, 0);
  await recordAudit({
    action: 'Courier weights recorded',
    target: carrier,
    detail: `${lines.lines.length} rows, ${formatPaise(total)} extra: ${created} new, ${duplicates} already recorded, ${notHeavier} not heavier, ${unknownCount} unknown AWBs.`,
  });
  revalidatePath('/admin/money/weight');
  return {
    status: 'saved',
    message:
      `${created} new weight ${created === 1 ? 'charge' : 'charges'} sent to merchants to answer within 7 days.` +
      (duplicates ? ` ${duplicates} already recorded.` : '') +
      (notHeavier ? ` ${notHeavier} not heavier than declared, skipped.` : '') +
      (unknownCount ? ` ${unknownCount} AWBs match no shipment: ${unknown.slice(0, 10).join(', ')}${unknownCount > 10 ? '…' : ''}.` : ''),
  };
}

/** Decides a disputed charge, for the courier (merchant pays) or the merchant (nothing charged). */
export async function resolveWeightAction(_previous: CodActionState, form: FormData): Promise<CodActionState> {
  await requireAdminSession();
  const id = field(form, 'id');
  const decision = field(form, 'decision');
  const note = field(form, 'note').trim();
  const errors: Record<string, string> = {};
  if (decision !== 'courier' && decision !== 'merchant') errors.decision = 'Choose who is right.';
  const noteError = validateResolutionNote(note);
  if (noteError) errors.note = noteError;
  if (Object.keys(errors).length > 0 || (decision !== 'courier' && decision !== 'merchant')) {
    return { status: 'invalid', errors, message: null };
  }

  const result = await adminWeightService().resolve(id, decision, note);
  if (!result.ok) {
    return {
      status: 'invalid',
      errors: {},
      message: result.error.kind === 'not_found' ? 'That weight charge does not exist.' : result.error.message,
    };
  }
  await recordAudit({
    action: 'Weight dispute decided',
    target: `${field(form, 'awb')} · ${field(form, 'merchant')}`,
    detail: `${decision === 'courier' ? 'For the courier: merchant charged' : 'For the merchant: nothing charged'}. ${note}`,
  });
  revalidatePath('/admin/money/weight');
  return {
    status: 'saved',
    message:
      decision === 'courier'
        ? 'Decided for the courier. The extra charge is taken from the merchant’s wallet.'
        : 'Decided for the merchant. Nothing is charged.',
  };
}
