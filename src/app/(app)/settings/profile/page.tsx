import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { profileService } from '@/lib/data/profile';
import { walletService } from '@/lib/data/wallet';
import { SettingsNav } from '../settings-nav';
import { PasswordForm, ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Profile | Evoc Ships' };

export default async function ProfilePage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const [wallet, profile] = await Promise.all([
    walletService().getBalance(),
    profileService().getProfile(),
  ]);

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader title="Profile" description="Your name, phone number and password." />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/profile" />

          <div className="grid min-w-0 gap-6">
            <DataCard testId="profile-card" title="Your details" result={profile}>
              {(data) => <ProfileForm profile={data} email={session.email} />}
            </DataCard>
            <DataCard testId="password-card" title="Change password" result={profile}>
              {() => <PasswordForm />}
            </DataCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
