/**
 * The rules for an admin wallet adjustment. No server code, so the Adjust popup can show the same
 * limits, but the server action checks everything again: never trust what the browser sends.
 */

export type WalletDirection = 'credit' | 'debit';

export interface WalletAdjustment {
  merchantId: string;
  /** Always positive; `direction` gives the sign. */
  amountPaise: number;
  direction: WalletDirection;
  reason: string;
}

/** The most one adjustment can move, the same ceiling as a merchant's own recharge. */
export const MAX_ADJUSTMENT_PAISE = 500_000 * 100;
export const REASON_MIN = 5;
export const REASON_MAX = 300;

export const AMOUNT_FORMAT_MESSAGE = 'Enter an amount in rupees, with up to 2 decimals, for example 1250.50.';
export const AMOUNT_RANGE_MESSAGE = 'Enter an amount from ₹0.01 to ₹5,00,000.';
export const DIRECTION_MESSAGE = 'Choose Credit or Debit.';
export const REASON_MESSAGE = `Give a reason of ${REASON_MIN} to ${REASON_MAX} characters.`;

export type AdjustmentField = 'amount' | 'direction' | 'reason';
export type AdjustmentErrors = Partial<Record<AdjustmentField, string>>;

/**
 * Rupees as typed ("1,250.5") to integer paise, from 1 paisa up to `maxPaise`, or the message to show.
 * Commas are allowed; at most 2 decimals.
 */
export function parseRupees(
  text: string,
  { maxPaise, rangeMessage }: { maxPaise: number; rangeMessage: string },
): { ok: true; paise: number } | { ok: false; message: string } {
  const cleaned = text.trim().replace(/,/g, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) {
    // "-50" and "0.001" are well-formed numbers, just outside what is allowed.
    return { ok: false, message: /^-?\d+(\.\d+)?$/.test(cleaned) ? rangeMessage : AMOUNT_FORMAT_MESSAGE };
  }
  const [rupees, fraction = ''] = cleaned.split('.');
  // Whole-number maths, so 0.29 never becomes 28.999… paise.
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  return isPaiseInRange(paise, maxPaise) ? { ok: true, paise } : { ok: false, message: rangeMessage };
}

export function isPaiseInRange(paise: unknown, maxPaise: number): paise is number {
  return typeof paise === 'number' && Number.isSafeInteger(paise) && paise > 0 && paise <= maxPaise;
}

/** An adjustment amount: rupees to paise, from ₹0.01 to ₹5,00,000. */
export function parseRupeesToPaise(text: string) {
  return parseRupees(text, { maxPaise: MAX_ADJUSTMENT_PAISE, rangeMessage: AMOUNT_RANGE_MESSAGE });
}

export function isAllowedAmount(paise: unknown): paise is number {
  return isPaiseInRange(paise, MAX_ADJUSTMENT_PAISE);
}

/** Spaces and line breaks collapse to single spaces, so the length counts what a reader sees. */
export function cleanReason(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Checks a submitted adjustment form. The merchant is checked separately, against the wallets. */
export function validateAdjustment(input: {
  merchantId: string;
  amount: string;
  direction: string;
  reason: string;
}): { ok: true; value: WalletAdjustment } | { ok: false; errors: AdjustmentErrors } {
  const errors: AdjustmentErrors = {};
  const amount = parseRupeesToPaise(input.amount);
  if (!amount.ok) errors.amount = amount.message;
  if (input.direction !== 'credit' && input.direction !== 'debit') errors.direction = DIRECTION_MESSAGE;
  const reason = cleanReason(input.reason);
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) errors.reason = REASON_MESSAGE;

  if (!amount.ok || errors.direction || errors.reason) return { ok: false, errors };
  return {
    ok: true,
    value: {
      merchantId: input.merchantId,
      amountPaise: amount.paise,
      direction: input.direction as WalletDirection,
      reason,
    },
  };
}

/** The balance after an adjustment. */
export function balanceAfter(balancePaise: number, { amountPaise, direction }: Pick<WalletAdjustment, 'amountPaise' | 'direction'>) {
  return direction === 'credit' ? balancePaise + amountPaise : balancePaise - amountPaise;
}
