import {
  Bell,
  Building2,
  ChevronRight,
  MapPin,
  Plug,
  Route,
  Store,
  UserRound,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { unavailable, visibleSettingsSections, type SettingsSection } from './settings-nav';

export const metadata: Metadata = { title: 'Settings | Evoc Ships' };

const ICONS: Record<string, LucideIcon> = {
  '/settings/profile': UserRound,
  '/settings/company': Building2,
  '/settings/users': Users,
  '/settings/pickup-addresses': MapPin,
  '/channel-integrations': Plug,
  '/settings/notifications': Bell,
  '/settings/tracking-page': Route,
  '/settings/courier-rules': Waypoints,
  '/settings/sub-merchants': Store,
};

const CARD =
  'flex h-full min-h-11 min-w-0 items-start gap-3 rounded-card border border-secondary bg-surface p-card';

function SectionCard({ section }: { section: SettingsSection }) {
  const Icon = ICONS[section.href] ?? Building2;
  const live = section.status === 'live';
  const body = (
    <>
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-control ${
          live ? 'bg-muted text-primary' : 'bg-tertiary text-on-surface/50'
        }`}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 font-heading text-lg leading-7 font-bold tracking-tight break-words">
            {section.label}
          </h2>
          {live ? (
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-primary transition-colors group-hover:text-accent"
            />
          ) : (
            <span className="shrink-0 rounded-control bg-muted px-2 py-0.5 text-xs font-medium">
              Not available yet
            </span>
          )}
        </span>
        <span className="text-sm text-on-surface/70">{section.description}</span>
      </span>
    </>
  );

  if (live) {
    return (
      <Link
        href={section.href}
        className={`${CARD} group lift transition-colors hover:border-primary active:bg-tertiary`}
      >
        {body}
      </Link>
    );
  }
  return (
    <div
      data-testid={`section-${section.href}`}
      aria-disabled="true"
      title={unavailable(section.label)}
      className={`${CARD} cursor-not-allowed text-on-surface/60`}
    >
      {body}
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Settings"
          description="Manage your account, your team and how your shipments are sent."
        />
        <ul className="motion-stagger grid gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {visibleSettingsSections().map((section, index) => (
            <li key={section.href} className="min-w-0" style={{ '--i': index } as CSSProperties}>
              <SectionCard section={section} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
