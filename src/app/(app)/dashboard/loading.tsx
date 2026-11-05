const BLOCKS = ['h-10', 'h-11', 'h-32', 'h-40', 'h-40'];

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28">
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
