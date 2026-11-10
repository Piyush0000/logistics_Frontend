const BLOCKS = ['h-11', 'h-16', 'h-14', 'h-24', 'h-56', 'h-72'];

export default function HomeLoading() {
  return (
    <div role="status" aria-label="Loading home" className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28">
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
