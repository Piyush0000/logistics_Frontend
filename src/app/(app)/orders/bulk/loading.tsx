const BLOCKS = ['h-16', 'h-48', 'h-64'];

export default function BulkUploadLoading() {
  return (
    <div
      role="status"
      aria-label="Loading bulk upload"
      className="grid gap-4 lg:gap-5"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
