/** Shared table classes: sticky header, roomy rows, hover tint, numbers in Geist Mono on the right. */
export const tableStyles = {
  wrap: 'min-w-0 overflow-x-auto rounded-card border border-secondary bg-surface',
  table: 'w-full border-collapse text-left text-sm',
  th: 'sticky top-0 z-[1] border-b border-secondary bg-tertiary/80 px-4 py-3 text-xs font-semibold tracking-wide text-on-surface/60 uppercase backdrop-blur',
  td: 'border-b border-secondary/70 px-4 py-3.5 align-middle',
  tdNumeric: 'border-b border-secondary/70 px-4 py-3.5 text-right font-mono tabular-nums',
  rowHover: 'transition-colors duration-150 hover:bg-muted/60',
} as const;
