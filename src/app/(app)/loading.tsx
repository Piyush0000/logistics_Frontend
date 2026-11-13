/** Shown in the content area while a page loads; the menu and top bar stay in place. */
export default function AppLoading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 lg:gap-5">
      <span className="block h-8 w-48 animate-pulse rounded-control bg-secondary/60" />
      <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="block h-28 animate-pulse rounded-card bg-secondary/50" />
        ))}
      </div>
      <span className="block h-72 animate-pulse rounded-card bg-secondary/40" />
    </div>
  );
}
