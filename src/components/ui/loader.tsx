/** The brand loader: the logo's two bars breathing. Use for "working…" states. */
export function Loader({ label = 'Loading', size = 'md' }: { label?: string; size?: 'sm' | 'md' }) {
  const bar = size === 'sm' ? 'h-[3px] w-4' : 'h-1 w-7';
  return (
    <span role="status" aria-label={label} className="inline-flex flex-col gap-[3px]">
      <span
        className={`${bar} block origin-left rounded-full bg-current motion-safe:animate-[evoc-bars_1.1s_ease-in-out_infinite]`}
      />
      <span
        className={`${bar} block origin-left rounded-full bg-current motion-safe:animate-[evoc-bars_1.1s_ease-in-out_0.18s_infinite]`}
      />
    </span>
  );
}
