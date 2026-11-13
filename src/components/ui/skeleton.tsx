/** A placeholder in the shape of content that is still streaming in. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-control bg-[linear-gradient(90deg,var(--c-secondary)_25%,var(--c-tertiary)_50%,var(--c-secondary)_75%)] bg-[length:200%_100%] motion-safe:animate-[evoc-shimmer_1.3s_linear_infinite] ${className}`}
    />
  );
}
