const BLOCKS = ['h-16', 'h-28', 'h-12', 'h-72'];

export default function RtoLoading() {
  return (
    <div
      role="status"
      aria-label="Loading RTO shipments"
      className="grid gap-4 lg:gap-5"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
