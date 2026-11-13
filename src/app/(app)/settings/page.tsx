import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { SETTINGS_SECTIONS, unavailable, type SettingsSection } from './settings-nav';

export const metadata: Metadata = { title: 'Settings | Evoc Ships' };

const CARD = 'flex min-h-11 min-w-0 flex-col gap-1 rounded-card border border-secondary bg-surface p-card';

function SectionCard({ section }: { section: SettingsSection }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 font-heading text-xl leading-7 break-words">{section.label}</h2>
        {section.status === 'live' ? (
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
        ) : (
          <span className="shrink-0 rounded-control bg-muted px-2 py-0.5 text-xs font-medium">
            Not available yet
          </span>
        )}
      </span>
      <span className="text-sm text-on-surface/70">{section.description}</span>
    </>
  );

  if (section.status === 'live') {
    return (
      <Link href={section.href} className={`${CARD} hover:border-primary`}>
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

  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Settings"
          description="Manage your account, your team and how your shipments are sent."
        />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section.href} className="min-w-0">
              <SectionCard section={section} />
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
