import type { Metadata } from 'next';
import Link from 'next/link';
import {
  samplePayload,
  WEBHOOK_EVENTS,
  WEBHOOK_HEADERS,
  WEBHOOK_RETRY_SCHEDULE,
} from '@/lib/data/webhooks/events';
import { Heading, Json, Table } from '../blocks';
import { CodeTabs } from '../code-tabs';

export const metadata: Metadata = { title: 'Webhooks' };

const VERIFY = [
  {
    label: 'Node.js',
    code: `import crypto from 'node:crypto';
import express from 'express';

const app = express();

// Read the raw body: the signature covers the exact bytes we sent.
app.post('/evoc/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  const timestamp = req.get('X-Evoc-Timestamp') ?? '';
  const signature = req.get('X-Evoc-Signature') ?? '';
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.EVOC_WEBHOOK_SECRET)
      .update(\`\${timestamp}.\`)
      .update(req.body)
      .digest('hex');

  const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300;
  const valid =
    fresh &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return res.status(400).end();

  const event = JSON.parse(req.body.toString('utf8'));
  // Skip it if you already handled event.id (retries resend the same id).
  // ... update your order using event.data.awb or event.data.reference_id ...
  res.status(200).end();
});`,
  },
  {
    label: 'Python',
    code: `import hashlib, hmac, json, os, time
from flask import Flask, request

app = Flask(__name__)

@app.post("/evoc/webhooks")
def evoc_webhook():
    timestamp = request.headers.get("X-Evoc-Timestamp", "")
    signature = request.headers.get("X-Evoc-Signature", "")
    body = request.get_data()  # the raw bytes
    expected = "sha256=" + hmac.new(
        os.environ["EVOC_WEBHOOK_SECRET"].encode(),
        timestamp.encode() + b"." + body,
        hashlib.sha256,
    ).hexdigest()

    fresh = timestamp.isdigit() and abs(time.time() - int(timestamp)) <= 300
    if not (fresh and hmac.compare_digest(signature, expected)):
        return "", 400

    event = json.loads(body)
    # Skip it if you already handled event["id"] (retries resend the same id).
    return "", 200`,
  },
  {
    label: 'PHP',
    code: `<?php
$timestamp = $_SERVER['HTTP_X_EVOC_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_EVOC_SIGNATURE'] ?? '';
$body = file_get_contents('php://input'); // the raw bytes

$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, getenv('EVOC_WEBHOOK_SECRET'));
$fresh = ctype_digit($timestamp) && abs(time() - (int) $timestamp) <= 300;

if (!$fresh || !hash_equals($expected, $signature)) {
    http_response_code(400);
    exit;
}

$event = json_decode($body, true);
// Skip it if you already handled $event['id'] (retries resend the same id).
http_response_code(200);`,
  },
];

export default function WebhooksPage() {
  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <header className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <h1 className="font-heading text-[28px] leading-9 font-extrabold tracking-tight lg:text-4xl">Webhooks</h1>
        <p className="max-w-3xl text-on-surface/80">
          Instead of asking for updates, let us tell you. When one of your shipments is booked, moves or fails, we send
          an HTTPS POST to your server within seconds, keyed by your Evoc AWB and your own reference.
        </p>
        <p className="max-w-3xl text-sm text-on-surface/80">
          Add a webhook in{' '}
          <Link href="/channel-integrations" className="font-medium text-primary underline">
            Settings, Channel Integrations
          </Link>
          : give a public https address and choose the events. You see its signing secret (it starts with whsec_) once; keep it on your server.
        </p>
      </header>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="events">
        <Heading id="events">Events</Heading>
        <Table
          head={['Event', 'When']}
          rows={WEBHOOK_EVENTS.map((e) => [<code key="e" className="font-mono text-xs whitespace-nowrap">{e.value}</code>, e.description])}
        />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-4" aria-labelledby="payloads">
        <Heading id="payloads">What we send</Heading>
        <p className="text-sm text-on-surface/80">
          The body is JSON: <code className="font-mono">id</code> (the event, the same on every retry),{' '}
          <code className="font-mono">type</code>, <code className="font-mono">created_at</code> and{' '}
          <code className="font-mono">data</code>. Statuses are the ones in the{' '}
          <Link href="/developers#statuses" className="text-primary underline">
            status table
          </Link>
          .
        </p>
        {WEBHOOK_EVENTS.map((e) => (
          <div key={e.value} className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <h3 className="font-mono text-sm font-semibold">{e.value}</h3>
            <Json value={samplePayload(e.value)} />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="headers">
        <Heading id="headers">Headers</Heading>
        <Table
          head={['Header', 'Meaning']}
          rows={WEBHOOK_HEADERS.map((h) => [<code key="h" className="font-mono text-xs whitespace-nowrap">{h.name}</code>, h.note])}
        />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="verify">
        <Heading id="verify">Check the signature</Heading>
        <p className="max-w-3xl text-sm text-on-surface/80">
          Work out <code className="font-mono">sha256=</code> plus the HMAC-SHA256 of the timestamp, a full stop and the
          raw body, keyed with your signing secret. Compare it with <code className="font-mono">X-Evoc-Signature</code>{' '}
          in constant time, and refuse timestamps more than 5 minutes old. Use the raw bytes: parsing and re-encoding the
          JSON changes the signature.
        </p>
        <CodeTabs samples={VERIFY} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="retries">
        <Heading id="retries">Answering and retries</Heading>
        <ul className="grid grid-cols-[minmax(0,1fr)] max-w-3xl list-disc gap-1.5 pl-5 text-sm text-on-surface/80">
          <li>Answer with any 2xx status within 5 seconds. Do slow work after you answer.</li>
          <li>
            A 5xx or 429 answer, a timeout or a connection error is retried after{' '}
            {WEBHOOK_RETRY_SCHEDULE.join(', ')}. Each attempt is signed again with a new timestamp.
          </li>
          <li>
            Any other 4xx answer is final: we take it as your server refusing that event, and do not retry it. Answer
            400 only for a bad signature.
          </li>
          <li>
            A webhook that keeps failing for 24 hours is paused. Fix your server, then switch it back on and retry from
            Delivery history.
          </li>
          <li>The same event can arrive more than once. Store event ids you handled and skip repeats.</li>
          <li>
            Events can arrive out of order. Use <code className="font-mono">data.status_at</code>, or read the shipment
            with GET /shipments/{'{awb}'}, when the order matters.
          </li>
          <li>Each delivery and its result is listed under Delivery history in Channel Integrations, where you can retry it.</li>
        </ul>
      </section>
    </article>
  );
}
