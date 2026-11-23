export const MIN_RECHARGE_PAISE = 100 * 100;
export const MAX_RECHARGE_PAISE = 500000 * 100;
export const RECHARGE_PRESETS_RUPEES = [500, 1000, 2500, 5000] as const;

export const RECHARGE_RANGE_MESSAGE = 'Enter an amount from ₹100 to ₹5,00,000.';
export const RECHARGE_WHOLE_MESSAGE = 'Enter whole rupees only, for example 1500.';

/** The rule the server enforces: whole rupees, within range. Never trust the browser's value. */
export function validateRechargePaise(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value % 100 === 0 &&
    value >= MIN_RECHARGE_PAISE &&
    value <= MAX_RECHARGE_PAISE
  );
}

/** Turns what a person typed into paise, or says what to fix. Commas are allowed. */
export function parseRechargeRupees(
  text: string,
): { ok: true; paise: number } | { ok: false; message: string } {
  const cleaned = text.trim().replace(/,/g, '');
  if (!/^\d+$/.test(cleaned)) {
    return {
      ok: false,
      message: /^\d+\.\d*$/.test(cleaned) ? RECHARGE_WHOLE_MESSAGE : RECHARGE_RANGE_MESSAGE,
    };
  }
  const paise = Number(cleaned) * 100;
  return validateRechargePaise(paise)
    ? { ok: true, paise }
    : { ok: false, message: RECHARGE_RANGE_MESSAGE };
}
