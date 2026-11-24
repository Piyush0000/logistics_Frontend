/**
 * Code 128 barcodes, the symbology couriers scan on shipping labels. Each symbol is six alternating
 * bar and space widths (in modules) adding up to 11; the stop symbol has seven, adding up to 13.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
] as const;

const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

export { PATTERNS as CODE128_PATTERNS };

/**
 * The symbol values for `text`: code set C (two digits per symbol) for runs of 4+ digits, code set B
 * (printable ASCII) for the rest, then the check symbol. Throws on characters Code 128 B can't hold.
 */
export function code128Values(text: string): number[] {
  if (!text) throw new Error('Nothing to encode');
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Cannot encode "${char}" in a barcode`);
  }
  const values: number[] = [];
  let set: 'B' | 'C' | null = null;
  let i = 0;
  const digitRun = (from: number) => {
    let n = 0;
    while (from + n < text.length && /\d/.test(text[from + n]!)) n += 1;
    return n;
  };
  while (i < text.length) {
    const run = digitRun(i);
    // Set C pays off for 4+ digits (or a whole all-digit text of 2+), in even counts.
    const useC = run >= 4 || (i === 0 && run === text.length && run >= 2);
    if (useC) {
      if (set !== 'C') {
        values.push(set === null ? START_C : CODE_C);
        set = 'C';
      }
      const pairs = Math.floor(run / 2);
      for (let p = 0; p < pairs; p += 1) {
        values.push(Number(text.slice(i, i + 2)));
        i += 2;
      }
      continue;
    }
    if (set !== 'B') {
      values.push(set === null ? START_B : CODE_B);
      set = 'B';
    }
    values.push(text.charCodeAt(i) - 32);
    i += 1;
  }
  const checksum = values.reduce((sum, value, index) => sum + value * (index === 0 ? 1 : index), 0) % 103;
  return [...values, checksum, STOP];
}

/** Bar and space widths, in modules, alternating and starting with a bar. */
export function code128Widths(text: string): number[] {
  return code128Values(text).flatMap((value) => [...PATTERNS[value]!].map(Number));
}
