import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, teamService } from '@/lib/data/team';
import { walletService } from '@/lib/data/wallet';
import { SettingsNav } from '../settings-nav';
import { TeamPanel } from './team-panel';

export const metadata: Metadata = { title: 'Users & Roles | Evoc Ships' };

export default async function UsersPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [wallet, members] = await Promise.all([
    walletService().getBalance(),
    teamService().listMembers(),
  ]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader title="Users & Roles" description="Invite teammates and choose what each can do." />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/users" />

          <div className="grid min-w-0 gap-6">
            <DataCard testId="team-card" title="Your team" result={members}>
              {(data) => <TeamPanel members={data} myEmail={session.email} />}
            </DataCard>

            <section
              data-testid="roles-card"
              className="min-w-0 rounded-card border border-secondary bg-surface p-card"
            >
              <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">
                What each role can do
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {ROLES.map((role) => (
                  <div key={role} className="min-w-0 rounded-control bg-muted p-3">
                    <dt className="text-sm font-medium">{ROLE_LABELS[role]}</dt>
                    <dd className="mt-1 text-sm text-on-surface/70">{ROLE_DESCRIPTIONS[role]}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
