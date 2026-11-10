const BLOCKS = ['h-16', 'h-80', 'h-40'];

export default function RateCalculatorLoading() {
  return (
    <div role="status" aria-label="Loading rate calculator" className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28">
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
