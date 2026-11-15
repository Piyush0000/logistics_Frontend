export default function TrackingNotFound() {
  return (
    <section className="rounded-card border border-secondary bg-surface p-card text-center">
      <h1 className="font-heading text-xl leading-7">We could not find that shipment</h1>
      <p className="mt-2 text-sm text-on-surface/70">
        Check the tracking link or AWB with the sender, then try again.
      </p>
    </section>
  );
}
