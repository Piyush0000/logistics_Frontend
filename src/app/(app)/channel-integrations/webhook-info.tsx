'use client';

import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { samplePayload, WEBHOOK_EVENTS, type WebhookEventName } from '@/lib/data/webhooks/events';
import { CopyButton } from './copy-button';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from './dialog';

// These match the headers sent by services/webhooks/src/deliveries/webhook-sender.ts.
const HEADERS = [
  { name: 'X-LogiCore-Signature', note: 'sha256= followed by the signature.' },
  { name: 'X-LogiCore-Timestamp', note: 'When it was sent, in Unix seconds.' },
  { name: 'X-LogiCore-Event-Id', note: 'Stays the same on a retry, so you can skip repeats.' },
];

const SUBHEADING = 'text-sm font-medium';

const payloadText = (event: WebhookEventName) => JSON.stringify(samplePayload(event), null, 2);

function PayloadList({ onSelect }: { onSelect: (event: WebhookEventName) => void }) {
  return (
    <>
      <p className="text-sm text-on-surface/70">
        Every webhook is a POST with a JSON body like these. Values shown are examples.
      </p>
      <div className="mt-4 grid gap-4">
        {WEBHOOK_EVENTS.map(({ value }) => (
          <section key={value} className="rounded-control border border-secondary p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-mono text-sm [overflow-wrap:anywhere]">{value}</h3>
              <button
                type="button"
                aria-label={`View Details of ${value}`}
                onClick={() => onSelect(value)}
                className={`${SECONDARY_BUTTON} text-primary`}
              >
                View Details
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-control bg-tertiary p-3 text-xs leading-5">
              {payloadText(value)}
            </pre>
          </section>
        ))}
      </div>
    </>
  );
}

function PayloadDetail({
  event,
  onSelect,
}: {
  event: WebhookEventName;
  onSelect: (event: WebhookEventName) => void;
}) {
  return (
    <>
      <h3 className="font-medium [overflow-wrap:anywhere]">Event: {event}</h3>
      <p className="mt-1 text-sm text-on-surface/70">
        This is the payload you will receive when this event happens. Values shown are examples.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-control bg-on-surface p-4 text-xs leading-5 text-tertiary">
        {payloadText(event)}
      </pre>
      <div className="mt-4 flex flex-wrap gap-2">
        {WEBHOOK_EVENTS.map(({ value }) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === event}
            onClick={() => onSelect(value)}
            className={`inline-flex min-h-11 items-center rounded-full px-3 font-mono text-xs [overflow-wrap:anywhere] lg:min-h-8 ${
              value === event ? 'bg-primary text-tertiary' : 'bg-muted text-primary'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </>
  );
}

function SamplePayloads({
  initialEvent,
  onClose,
}: {
  /** Opens on this event, or on the full list when there is none. */
  initialEvent: WebhookEventName | null;
  onClose: () => void;
}) {
  const [event, setEvent] = useState(initialEvent);

  return (
    <Dialog title="Sample Payloads" wide onClose={onClose}>
      {event ? (
        <PayloadDetail event={event} onSelect={setEvent} />
      ) : (
        <PayloadList onSelect={setEvent} />
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-secondary pt-4">
        {/* The key clears "Copied" when moving to another event. */}
        {event ? <CopyButton key={event} label="Copy Payload" text={payloadText(event)} /> : null}
        <button type="button" onClick={onClose} className={PRIMARY_BUTTON}>
          Close
        </button>
      </div>
    </Dialog>
  );
}

export function WebhookInfo() {
  const [open, setOpen] = useState(false);
  // The event to open on, 'all' for the full list, or null when closed.
  const [payloads, setPayloads] = useState<WebhookEventName | 'all' | null>(null);

  return (
    <section
      data-testid="webhook-info"
      aria-label="Webhook Information"
      className="order-last rounded-card border border-secondary bg-surface p-card lg:order-first"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left lg:hidden"
      >
        <span className="flex items-center gap-2 font-heading text-xl leading-7">
          <Info aria-hidden="true" className="size-5 text-primary" />
          Webhook Information
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <h2 className="hidden items-center gap-2 font-heading text-xl leading-7 lg:flex">
        <Info aria-hidden="true" className="size-5 text-primary" />
        Webhook Information
      </h2>

      <div className={`mt-3 grid gap-4 text-sm leading-5 ${open ? '' : 'max-lg:hidden'}`}>
        <p className="text-on-surface/70">
          Webhooks tell your system about shipment events as they happen. When an event occurs, we
          send a POST request with the details to the address you choose.
        </p>

        <div className="grid gap-2 border-t border-secondary pt-4">
          <h3 className={SUBHEADING}>Security</h3>
          <p className="text-on-surface/70">
            Each request is signed with HMAC SHA-256, using your signing secret on the timestamp, a
            full stop and the raw body. Check the signature to confirm the request came from us.
          </p>
          <ul className="grid gap-2">
            {HEADERS.map(({ name, note }) => (
              <li key={name} className="rounded-control bg-tertiary p-2">
                <code className="block text-xs [overflow-wrap:anywhere]">{name}</code>
                <span className="block text-xs leading-4 text-on-surface/70">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-2 border-t border-secondary pt-4">
          <h3 className={SUBHEADING}>Sample Payloads</h3>
          <p className="text-on-surface/70">See the data you will receive for each event.</p>
          <button
            type="button"
            onClick={() => setPayloads('all')}
            className={`${SECONDARY_BUTTON} w-full text-primary`}
          >
            View Sample Payloads
          </button>
        </div>

        <div className="grid gap-2 border-t border-secondary pt-4">
          <h3 className={SUBHEADING}>Available Events</h3>
          <ul className="grid gap-1">
            {WEBHOOK_EVENTS.map(({ value }) => (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => setPayloads(value)}
                  className="flex min-h-11 w-full items-center rounded-control px-2 text-left font-mono text-xs text-primary hover:bg-muted [overflow-wrap:anywhere] lg:min-h-8"
                >
                  {value}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {payloads ? (
        <SamplePayloads
          initialEvent={payloads === 'all' ? null : payloads}
          onClose={() => setPayloads(null)}
        />
      ) : null}
    </section>
  );
}
