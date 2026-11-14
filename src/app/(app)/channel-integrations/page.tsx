import { KeyRound, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { webhookService } from '@/lib/data/webhooks';
import { DetailCard } from '../dashboard/sections';
import { DeliveryHistory } from './delivery-history';
import { WebhookInfo } from './webhook-info';
import { WebhooksPanel } from './webhooks-panel';

export const metadata: Metadata = { title: 'Channel Integrations | Evoc Ships' };

const PATH = '/channel-integrations';

const TABS = [
  { id: 'api-keys', label: 'API Keys', href: `${PATH}?tab=api-keys` },
  { id: 'webhooks', label: 'Webhooks', href: PATH },
];

function Tabs({ active }: { active: string }) {
  return (
    <nav
      aria-label="Integration sections"
      className="flex w-full gap-1 rounded-card border border-secondary bg-surface p-1.5 sm:w-fit"
    >
      {TABS.map(({ id, label, href }) => (
        <Link
          key={id}
          href={href}
          aria-current={id === active ? 'page' : undefined}
          className={`inline-flex h-11 min-w-28 flex-1 items-center justify-center rounded-control px-4 text-sm transition-colors duration-150 sm:flex-none lg:h-10 ${
            id === active
              ? 'bg-muted font-semibold text-primary'
              : 'font-medium text-on-surface/75 hover:bg-muted hover:text-primary'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

// The backend has no API key routes, so nothing here pretends to create a key.
function ApiKeys() {
  return (
    <section
      aria-label="API Keys"
      className="motion-rise grid justify-items-center gap-3 rounded-card border border-secondary bg-surface p-card py-12 text-center"
    >
      <span className="grid size-14 place-items-center rounded-card bg-muted text-primary">
        <KeyRound aria-hidden="true" className="size-7" />
      </span>
      <p className="text-sm">API keys are not available yet.</p>
      <p className="text-sm text-on-surface/70">You will be able to create them here later.</p>
      <button type="button" disabled className={PRIMARY_BUTTON}>
        <Plus aria-hidden="true" className="size-4" />
        Create API Key
      </button>
    </section>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ChannelIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const tab = first(params.tab) === 'api-keys' ? 'api-keys' : 'webhooks';
  // A position that is not a real id is ignored, the same as any other bad URL value.
  const cursor = z.string().uuid().safeParse(first(params.cursor)).data;

  const service = webhookService();
  const [webhooks, deliveries] = await Promise.all([
    tab === 'webhooks' ? service.list() : null,
    tab === 'webhooks' ? service.listDeliveries(cursor) : null,
  ]);

  return (
    <>
      <PageHeader title="Channel Integrations" description="Manage API keys and webhook subscriptions" />

      <Tabs active={tab} />

      {webhooks && deliveries ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-5 2xl:grid-cols-[26rem_minmax(0,1fr)]">
            <DetailCard testId="webhooks-card" title="Webhooks" result={webhooks}>
              {(items) => <WebhooksPanel webhooks={items} />}
            </DetailCard>
            <WebhookInfo />
          </div>

          <DetailCard testId="deliveries-card" title="Delivery history" result={deliveries}>
            {(page) => <DeliveryHistory page={page} isFirstPage={!cursor} basePath={PATH} />}
          </DetailCard>
        </>
      ) : (
        <ApiKeys />
      )}
    </>
  );
}
