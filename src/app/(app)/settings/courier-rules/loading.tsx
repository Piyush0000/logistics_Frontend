const BLOCKS = ['h-16', 'h-96'];

export default function CourierRulesLoading() {
  return (
    <div
      role="status"
      aria-label="Loading courier rules"
      className="grid gap-4 lg:gap-5"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
