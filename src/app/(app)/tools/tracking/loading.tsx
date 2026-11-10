const BLOCKS = ['h-24', 'h-56', 'h-64'];

export default function TrackingLoading() {
  return (
    <div role="status" aria-label="Loading order tracking" className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28">
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
