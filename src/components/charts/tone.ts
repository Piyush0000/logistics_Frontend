/**
 * Chart colours. Series hues come in a fixed order (blue, teal, amber), validated for colour-blind
 * separation in both themes; status tones are only for states (delivered, at risk, failed).
 */
export type Tone = 'primary' | 'series2' | 'series3' | 'success' | 'warning' | 'error';

export const TONE_FILL: Record<Tone, string> = {
  primary: 'fill-primary',
  series2: 'fill-series-2',
  series3: 'fill-series-3',
  success: 'fill-success',
  warning: 'fill-warning',
  error: 'fill-error',
};

export const TONE_STROKE: Record<Tone, string> = {
  primary: 'stroke-primary',
  series2: 'stroke-series-2',
  series3: 'stroke-series-3',
  success: 'stroke-success',
  warning: 'stroke-warning',
  error: 'stroke-error',
};

export const TONE_BG: Record<Tone, string> = {
  primary: 'bg-primary',
  series2: 'bg-series-2',
  series3: 'bg-series-3',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

/** NaN, Infinity and negatives become 0, so a bad value never breaks a chart. */
export function safe(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
