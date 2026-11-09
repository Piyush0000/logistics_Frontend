const BLOCKS = ['h-14', 'h-11', 'h-64', 'h-96'];

export default function ChannelIntegrationsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading channel integrations"
      className="grid gap-4 p-4 lg:gap-5 lg:p-8 lg:pl-28"
    >
      {BLOCKS.map((height, index) => (
        <div key={index} className={`${height} animate-pulse rounded-card bg-muted`} />
      ))}
    </div>
  );
}
