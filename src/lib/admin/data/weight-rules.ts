import { csvCells } from './money/cod-rules';

export const MAX_WEIGHT_LINES = 2000;
export const WEIGHT_CARRIERS = [
  { value: 'delhivery', label: 'Delhivery' },
  { value: 'ekart', label: 'Ekart' },
  { value: 'shadowfax', label: 'Shadowfax' },
] as const;
export const RESOLUTION_NOTE_MIN = 3;
export const RESOLUTION_NOTE_MAX = 500;

export interface WeightLine {
  awb: string;
  chargedGrams: number;
  extraChargePaise: number;
}

/** "1.25", "1,250", "₹45.50" and "Rs 45" as a number; null when it isn't one. */
function number(text: string | undefined): number | null {
  const cleaned = (text ?? '').trim().replace(/^₹|^Rs\.?\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/**
 * Reads a courier's weight file. It needs an AWB column, a charged weight column (kilograms, or
 * grams when the header says so) and an extra charge column in rupees.
 */
export function parseWeightCsv(text: string): { ok: true; lines: WeightLine[] } | { ok: false; message: string } {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((row) => row.trim() !== '');
  if (rows.length < 2) return { ok: false, message: 'The file needs a header row and at least one AWB row.' };
  const header = csvCells(rows[0]!).map((name) => name.trim().toLowerCase());
  const awbColumn = header.findIndex((name) => /awb|waybill/.test(name));
  const weightColumn = header.findIndex((name, i) => i !== awbColumn && /weight/.test(name) && !/declared/.test(name));
  const chargeColumn = header.findIndex(
    (name, i) => i !== awbColumn && i !== weightColumn && /extra|excess|difference|charge|amount/.test(name),
  );
  if (awbColumn < 0 || weightColumn < 0 || chargeColumn < 0) {
    return { ok: false, message: 'The header must have an AWB column, a charged weight column and an extra charge column.' };
  }
  if (rows.length - 1 > MAX_WEIGHT_LINES) return { ok: false, message: `A file can have at most ${MAX_WEIGHT_LINES} rows.` };
  const grams = /\(g\)|\bgrams?\b|\bgm?s?\b/.test(header[weightColumn]!) && !/kg/.test(header[weightColumn]!);

  const lines: WeightLine[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const cells = csvCells(rows[index]!);
    const row = index + 1;
    const awb = (cells[awbColumn] ?? '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9-]{4,40}$/.test(awb)) return { ok: false, message: `Row ${row}: the AWB is missing or invalid.` };
    const weight = number(cells[weightColumn]);
    if (weight === null || weight <= 0) return { ok: false, message: `Row ${row}: the charged weight is not a number.` };
    const chargedGrams = Math.round(grams ? weight : weight * 1000);
    if (chargedGrams > 1_000_000) return { ok: false, message: `Row ${row}: the charged weight is above 1,000 kg.` };
    const rupees = number(cells[chargeColumn]);
    if (rupees === null) return { ok: false, message: `Row ${row}: the extra charge is not a rupee amount.` };
    const extraChargePaise = Math.round(rupees * 100);
    if (extraChargePaise > 5_000_000) return { ok: false, message: `Row ${row}: the extra charge is above ₹50,000.` };
    lines.push({ awb, chargedGrams, extraChargePaise });
  }
  return { ok: true, lines };
}

export function validateResolutionNote(text: string): string | null {
  const length = text.trim().length;
  if (length < RESOLUTION_NOTE_MIN) return 'Say why, in a few words.';
  if (length > RESOLUTION_NOTE_MAX) return `Keep it to ${RESOLUTION_NOTE_MAX} characters.`;
  return null;
}
