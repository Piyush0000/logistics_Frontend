import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { getAdminSession } from '@/lib/admin/session';
import { liveDataOnly } from '@/lib/data/source';

export const metadata: Metadata = {
  title: { default: 'Admin | Evoc Ships', template: '%s | Evoc Ships Admin' },
  robots: { index: false, follow: false },
};

/**
 * The founder-only admin panel. With a session the shell wraps every page; without one, pages
 * render bare (the sign-in page) or redirect to it themselves via requireAdminSession(), so a
 * page that does not exist can still answer 404.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  return (
    <div className="theme-app font-body">
      {session ? <AdminShell email={session.email} liveOnly={liveDataOnly()}>{children}</AdminShell> : children}
    </div>
  );
}
