export type ChipTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const TONES: Record<ChipTone, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  info: 'bg-muted text-primary',
  neutral: 'bg-tertiary text-on-surface/70',
};

/** A small coloured label for a status. Colour is never the only signal: the text says it too. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-5 font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
