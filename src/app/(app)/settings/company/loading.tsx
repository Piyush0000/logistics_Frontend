const BLOCKS = ['h-16', 'h-96'];

export default function CompanyLoading() {
  return (
    <div
      role="status"
      aria-label="Loading company details"
      className="grid gap-4 lg:gap-5"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
