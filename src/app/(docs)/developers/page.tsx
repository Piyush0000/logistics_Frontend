import type { Metadata } from 'next';
import Link from 'next/link';
import { ERRORS, SECTIONS, STATUSES } from '@/content/developers/reference';
import { BASE_URL, Heading, Json, Table } from './blocks';
import { CodeTabs } from './code-tabs';

export const metadata: Metadata = { title: 'Overview' };

const STEPS = [
  {
    title: 'Sign up and get verified',
    body: 'Create your account, then send your company and KYC details. Booking is open once our team verifies them.',
  },
  {
    title: 'Create an API key',
    body: 'Open Settings, then Channel Integrations, and create a key. It starts with evs_live_ and is shown once: store it as a secret on your server.',
  },
  {
    title: 'Add money to your wallet',
    body: 'Each booking holds its shipping charge from the wallet. With too little money, booking answers 402.',
  },
  {
    title: 'Quote, then book',
    body: 'Check prices with POST /rates/quote, book with POST /shipments, and subscribe to webhooks for status changes.',
  },
];

const FIRST_CALL = [
  {
    label: 'curl',
    code: `curl '${BASE_URL}/wallet' \\\n  -H "Authorization: Bearer $EVOC_API_KEY"`,
  },
  {
    label: 'Node.js',
    code: `const res = await fetch('${BASE_URL}/wallet', {\n  headers: { Authorization: \`Bearer \${process.env.EVOC_API_KEY}\` },\n});\nconsole.log(await res.json());`,
  },
  {
    label: 'Python',
    code: `import os, requests\n\nres = requests.get(\n    "${BASE_URL}/wallet",\n    headers={"Authorization": f"Bearer {os.environ['EVOC_API_KEY']}"},\n    timeout=30,\n)\nprint(res.json())`,
  },
];

export default function DevelopersOverview() {
  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-10">
      <header className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <h1 className="font-heading text-[28px] leading-9 font-extrabold tracking-tight lg:text-4xl">Evoc Ships API</h1>
        <p className="max-w-2xl text-on-surface/80">
          Book shipments with India&apos;s couriers, track them, handle failed deliveries and follow your money, all
          from your own store or system. One API key, one wallet, and your Evoc AWB on every response.
        </p>
        <p className="w-fit rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <strong>Every call is live.</strong> There is no test mode yet: a booking arranges a real courier pickup and
          charges your wallet. Cancel test bookings before pickup to get the charge back.
        </p>
      </header>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-4" aria-labelledby="start">
        <Heading id="start">Quick start</Heading>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-card border border-secondary bg-surface p-4">
              <p className="text-xs font-semibold text-primary">Step {index + 1}</p>
              <p className="mt-1 font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-on-surface/80">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm">Your first call, to check the key works:</p>
        <CodeTabs samples={FIRST_CALL} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="basics">
        <Heading id="basics">Basics</Heading>
        <Table
          rows={[
            ['Base URL', <code key="b" className="font-mono text-sm">{BASE_URL}</code>],
            [
              'Authentication',
              <span key="a">
                Send <code className="font-mono">Authorization: Bearer &lt;your API key&gt;</code> on every request. An
                API key acts for your whole account; revoke it in Channel Integrations if it leaks.
              </span>,
            ],
            ['Format', 'JSON in, JSON out. Send Content-Type: application/json with a body.'],
            [
              'Money',
              'Amounts ending in _paise are whole paise (₹1 = 100 paise). Prices in a booking (unit_price, cod_amount) are rupees.',
            ],
            ['Times', 'ISO 8601 in UTC, for example 2026-11-24T09:56:05.150Z. Dates without a time are Indian dates.'],
            [
              'AWB',
              'Your Evoc AWB, EVS followed by 10 digits, identifies a shipment everywhere. Routes also accept the shipment id.',
            ],
            [
              'Retries',
              'Booking takes an idempotency_key: sending the same key again returns the first shipment, so retrying after a timeout never books twice.',
            ],
          ]}
        />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="errors">
        <Heading id="errors">Errors</Heading>
        <p className="text-sm text-on-surface/80">
          A failed call answers with an HTTP status and a JSON body with a <code className="font-mono">message</code>.
          Validation errors also list each field:
        </p>
        <Json
          value={{
            error: 'VALIDATION_FAILED',
            issues: [
              { path: 'destination.pincode', message: 'Indian pincodes must be 6 digits and not start with 0' },
              { path: 'cod_amount', message: 'cod_amount must be > 0 when payment_type is COD' },
            ],
          }}
        />
        <Table head={['Status', 'Meaning']} rows={ERRORS.map((e) => [<b key="s" className="font-mono">{e.status}</b>, e.meaning])} />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="statuses">
        <Heading id="statuses">Shipment statuses</Heading>
        <Table
          head={['Status', 'Meaning']}
          rows={STATUSES.map((s) => [<code key="s" className="font-mono text-xs">{s.status}</code>, s.meaning])}
        />
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-labelledby="reference">
        <Heading id="reference">API reference</Heading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...SECTIONS.map((s) => ({ href: `/developers/${s.slug}`, title: s.title, summary: s.summary })), {
            href: '/developers/webhooks',
            title: 'Webhooks',
            summary: 'Get told when a shipment is booked, moves or fails.',
          }].map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block h-full rounded-card border border-secondary bg-surface p-4 hover:border-primary/50"
              >
                <p className="font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-on-surface/80">{s.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
