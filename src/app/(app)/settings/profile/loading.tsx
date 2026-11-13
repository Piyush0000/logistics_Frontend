const BLOCKS = ['h-16', 'h-80', 'h-80'];

export default function ProfileLoading() {
  return (
    <div
      role="status"
      aria-label="Loading profile"
      className="grid gap-4 lg:gap-5"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
