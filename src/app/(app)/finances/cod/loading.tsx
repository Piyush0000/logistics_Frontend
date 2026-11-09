const BLOCKS = ['h-14', 'h-32', 'h-28', 'h-96'];

export default function CodLoading() {
  return (
    <div
      role="status"
      aria-label="Loading COD remittance"
      className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
