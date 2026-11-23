import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { getDemoSession } from '@/lib/auth/session';
import { notificationService } from '@/lib/data/notifications';
import { SettingsNav } from '../settings-nav';
import { NotificationEditor } from './notification-editor';

export const metadata: Metadata = { title: 'Buyer notifications | Evoc Ships' };

export default async function NotificationsPage() {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const settings = await notificationService().get();

  return (
    <>
      <div className="grid gap-6">
        <PageHeader
          title="Buyer notifications"
          description="Choose which messages your buyers get about their parcels. Your choices are saved now; messages go out once an SMS, email or WhatsApp provider is connected."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SettingsNav current="/settings/notifications" />

          <div className="grid min-w-0 gap-6">
            <DataCard testId="notifications-card" title="Messages to buyers" result={settings}>
              {(data) => <NotificationEditor initial={data} />}
            </DataCard>
          </div>
        </div>
      </div>
    </>
  );
}
