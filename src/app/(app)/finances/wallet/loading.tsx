const BLOCKS = ['h-10', 'h-28', 'h-40', 'h-96'];

export default function WalletLoading() {
  return (
    <div
      role="status"
      aria-label="Loading wallet transactions"
      className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
