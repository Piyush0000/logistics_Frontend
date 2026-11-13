const BLOCKS = ['h-16', 'h-28', 'h-48', 'h-48'];

export default function ReportsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading reports"
      className="grid gap-4 lg:gap-5"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
