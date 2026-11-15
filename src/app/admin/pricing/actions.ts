'use server';

import { revalidatePath } from 'next/cache';
import { adminPricingService, type RateCardRow } from '@/lib/admin/data/pricing';
import { validateOverride, validateRate } from '@/lib/admin/data/pricing/pricing-rules';
import { recordAudit } from '@/lib/admin/data/system';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise } from '@/lib/format/money';
import type { ApiError } from '@/lib/gateway/errors';

export type PricingActionState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: Record<string, string>; message: string | null }
  /** Rate edit checked but not saved: the confirm step shows old and new. */
  | { status: 'review'; before: RateCardRow; after: RateCardRow }
  | { status: 'saved'; message: string };

const MAX_FIELD = 1000;
const field = (form: FormData, name: string) => String(form.get(name) ?? '').slice(0, MAX_FIELD);
const failed = (error: ApiError): PricingActionState => ({ status: 'invalid', errors: {}, message: error.message });

function refresh() {
  revalidatePath('/admin/pricing');
  revalidatePath('/admin/system');
}

export async function setCourierAction(_previous: PricingActionState, form: FormData): Promise<PricingActionState> {
  await requireAdminSession();
  const enabled = field(form, 'enabled') === 'true';
  const result = await adminPricingService().setCourierEnabled(field(form, 'carrier'), enabled);
  if (!result.ok) return failed(result.error);

  await recordAudit({
    action: enabled ? 'Courier enabled' : 'Courier disabled',
    target: result.data.carrier,
    detail: enabled ? `${result.data.name} turned on for new bookings.` : `${result.data.name} turned off for new bookings.`,
  });
  refresh();
  return { status: 'saved', message: `${result.data.name} is ${enabled ? 'on' : 'off'}.` };
}

/** "Base ₹43.00 → ₹45.00; COD 1.75% → 2%", listing only what changed. */
function describeChange(before: RateCardRow, after: RateCardRow): string {
  const parts: string[] = [];
  const money = (label: string, key: 'basePaise' | 'extraPer500gPaise' | 'codMinimumPaise') => {
    if (before[key] !== after[key]) parts.push(`${label} ${formatPaise(before[key])} → ${formatPaise(after[key])}`);
  };
  money('Base', 'basePaise');
  money('Each extra 500 g', 'extraPer500gPaise');
  if (before.codPercent !== after.codPercent) parts.push(`COD ${before.codPercent}% → ${after.codPercent}%`);
  money('COD minimum', 'codMinimumPaise');
  return parts.length ? `${parts.join('; ')}.` : 'No change.';
}

/** Two steps: `step=review` checks and shows old and new without saving; `step=confirm` saves and audits. */
export async function updateRateAction(_previous: PricingActionState, form: FormData): Promise<PricingActionState> {
  await requireAdminSession();
  const checked = validateRate({
    carrier: field(form, 'carrier'),
    zone: field(form, 'zone'),
    base: field(form, 'base'),
    extra: field(form, 'extra'),
    codPercent: field(form, 'codPercent'),
    codMinimum: field(form, 'codMinimum'),
  });
  if (!checked.ok) {
    const { row, ...errors } = checked.errors;
    return { status: 'invalid', errors, message: row ?? null };
  }
  const change = checked.value;
  const service = adminPricingService();

  if (field(form, 'step') !== 'confirm') {
    const card = await service.listRateCard();
    if (!card.ok) return failed(card.error);
    const before = card.data.find((row) => row.carrier === change.carrier && row.zone === change.zone);
    if (!before) return { status: 'invalid', errors: {}, message: 'That rate card row does not exist.' };
    return { status: 'review', before, after: { ...before, ...change } };
  }

  const result = await service.updateRate(change);
  if (!result.ok) return failed(result.error);
  await recordAudit({
    action: 'Rate card updated',
    target: `${change.carrier} · zone ${change.zone}`,
    detail: describeChange(result.data.before, result.data.after),
  });
  refresh();
  return { status: 'saved', message: `Saved zone ${change.zone} for ${change.carrier}.` };
}

export async function addOverrideAction(_previous: PricingActionState, form: FormData): Promise<PricingActionState> {
  await requireAdminSession();
  const checked = validateOverride({
    merchantId: field(form, 'merchantId'),
    carrier: field(form, 'carrier'),
    discount: field(form, 'discount'),
    reason: field(form, 'reason'),
  });
  if (!checked.ok) return { status: 'invalid', errors: checked.errors, message: null };

  const result = await adminPricingService().addOverride(checked.value);
  if (!result.ok) return failed(result.error);
  const entry = result.data;
  await recordAudit({
    action: 'Price override added',
    target: `${entry.merchantId} · ${entry.merchantName}`,
    detail: `${entry.discountPercent}% off ${entry.carrier === 'all' ? 'all couriers' : entry.carrier}. ${entry.reason}`,
  });
  refresh();
  return { status: 'saved', message: `${entry.merchantName} now gets ${entry.discountPercent}% off.` };
}

export async function removeOverrideAction(_previous: PricingActionState, form: FormData): Promise<PricingActionState> {
  await requireAdminSession();
  const result = await adminPricingService().removeOverride(field(form, 'id'));
  if (!result.ok) return failed(result.error);
  const entry = result.data;
  await recordAudit({
    action: 'Price override removed',
    target: `${entry.merchantId} · ${entry.merchantName}`,
    detail: `Was ${entry.discountPercent}% off ${entry.carrier === 'all' ? 'all couriers' : entry.carrier}.`,
  });
  refresh();
  return { status: 'saved', message: `Removed. ${entry.merchantName} pays the rate card again.` };
}
