/**
 * The Evoc Ships logo, traced from public/brand/evoc-ships-logo.png: a block with a rounded top and a
 * darker band, two bars (the "=" motif), then the wordmark.
 */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 456 280" aria-hidden="true" className={className} focusable="false">
      <path d="M0 35A35 35 0 0 1 35 0H269A35 35 0 0 1 304 35V210H0Z" fill="#183EEB" />
      <rect x="0" y="210" width="304" height="70" fill="#112CAB" />
      <rect x="351" y="82" width="105" height="35" fill="#183EEB" />
      <rect x="351" y="164" width="105" height="34" fill="#183EEB" />
    </svg>
  );
}

/**
 * `compact` shows the mark only (collapsed menu, phone top bar). `onDark` forces the light wordmark
 * for dark panels; otherwise the wordmark follows the theme's text colour.
 */
export function BrandMark({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  if (compact) {
    return (
      <span role="img" aria-label="Evoc Ships" className="inline-flex shrink-0 items-center">
        <Mark className="h-6 w-auto" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 text-left">
      <Mark className="h-6 w-auto shrink-0" />
      <span
        className={`font-heading text-xl leading-6 font-bold tracking-[-0.02em] ${
          onDark ? 'text-[#E6EBF7]' : 'text-on-surface'
        }`}
      >
        Evoc Ships
      </span>
    </span>
  );
}
