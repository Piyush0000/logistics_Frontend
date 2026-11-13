import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ShellIdentityProvider } from '@/components/shell/shell-identity';
import { WalletChip, WalletChipSkeleton } from '@/components/shell/wallet-chip';
import { getDemoSession } from '@/lib/auth/session';

/**
 * Signed-in screens. The shell renders here once and stays mounted between pages; pages render only
 * their content. The wallet chip streams in on its own, so a slow balance never holds the page.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  return (
    <ShellIdentityProvider email={session.email}>
      <div className="theme-app font-body">
        <AppShell
          email={session.email}
          wallet={
            <Suspense fallback={<WalletChipSkeleton />}>
              <WalletChip />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </div>
    </ShellIdentityProvider>
  );
}
