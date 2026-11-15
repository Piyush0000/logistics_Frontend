'use server';

import { revalidatePath } from 'next/cache';
import { adminMoneyService } from '@/lib/admin/data/money';
import { balanceAfter, validateAdjustment, type AdjustmentErrors, type WalletDirection } from '@/lib/admin/data/money/wallet-adjustment';
import { recordAudit } from '@/lib/admin/data/system';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise } from '@/lib/format/money';

export type AdjustWalletState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: AdjustmentErrors; message: string | null }
  /** Checked but not saved: what the confirm step shows. */
  | { status: 'review'; amountPaise: number; direction: WalletDirection; reason: string; currentPaise: number; newPaise: number }
  | { status: 'saved'; balancePaise: number; message: string };

const MAX_FIELD = 1000;
const field = (form: FormData, name: string) => String(form.get(name) ?? '').slice(0, MAX_FIELD);

/**
 * The Adjust popup's two steps. `step=review` checks the input and returns the new balance without
 * saving; `step=confirm` checks it all again, saves, and records the change in the audit log.
 */
export async function adjustWalletAction(_previous: AdjustWalletState, form: FormData): Promise<AdjustWalletState> {
  await requireAdminSession();

  const checked = validateAdjustment({
    merchantId: field(form, 'merchantId'),
    amount: field(form, 'amount'),
    direction: field(form, 'direction'),
    reason: field(form, 'reason'),
  });
  if (!checked.ok) return { status: 'invalid', errors: checked.errors, message: null };
  const adjustment = checked.value;

  const service = adminMoneyService();
  const wallet = await service.getMerchantWallet(adjustment.merchantId);
  if (!wallet.ok) {
    return {
      status: 'invalid',
      errors: {},
      message: wallet.error.kind === 'not_found' ? 'That merchant does not exist.' : wallet.error.message,
    };
  }

  if (field(form, 'step') !== 'confirm') {
    return {
      status: 'review',
      amountPaise: adjustment.amountPaise,
      direction: adjustment.direction,
      reason: adjustment.reason,
      currentPaise: wallet.data.balancePaise,
      newPaise: balanceAfter(wallet.data.balancePaise, adjustment),
    };
  }

  const saved = await service.adjustWallet(adjustment);
  if (!saved.ok) {
    return {
      status: 'invalid',
      errors: {},
      message: saved.error.kind === 'not_found' ? 'That merchant does not exist.' : saved.error.message,
    };
  }

  const verb = adjustment.direction === 'credit' ? 'credit' : 'debit';
  await recordAudit({
    action: adjustment.direction === 'credit' ? 'Wallet credit' : 'Wallet debit',
    target: `${saved.data.merchantId} · ${saved.data.merchantName}`,
    detail: `${formatPaise(adjustment.amountPaise)}. ${adjustment.reason}`,
  });

  revalidatePath('/admin/money', 'layout');
  revalidatePath('/admin/system');
  return {
    status: 'saved',
    balancePaise: saved.data.balancePaise,
    message: `Saved the ${verb} of ${formatPaise(adjustment.amountPaise)}. New balance ${formatPaise(saved.data.balancePaise)}.`,
  };
}
