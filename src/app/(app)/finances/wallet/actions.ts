'use server';

import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { RECHARGE_RANGE_MESSAGE, validateRechargePaise } from '@/lib/data/wallet/recharge';

export type RechargeActionResult =
  { ok: true; paymentUrl: string | null } | { ok: false; message: string };

const isSecureUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

// Server actions can be called directly, so this checks the session and the amount itself.
export async function startRechargeAction(amountPaise: unknown): Promise<RechargeActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' };
  if (!validateRechargePaise(amountPaise)) return { ok: false, message: RECHARGE_RANGE_MESSAGE };

  const result = await walletService().startRecharge(amountPaise);
  if (!result.ok) return { ok: false, message: result.error.message };

  const { paymentUrl } = result.data;
  if (paymentUrl !== null && !isSecureUrl(paymentUrl)) {
    return { ok: false, message: 'The payment page could not be opened. Please try again.' };
  }
  return { ok: true, paymentUrl };
}
