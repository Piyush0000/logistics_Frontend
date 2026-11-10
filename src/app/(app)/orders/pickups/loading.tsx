const BLOCKS = ['h-16', 'h-72', 'h-72'];

export default function PickupsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading pickups"
      className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
