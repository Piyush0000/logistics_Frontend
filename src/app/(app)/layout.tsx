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
  // No session: no shell. Each page redirects to /login itself, so a page that does not exist can
  // still answer 404 first (a redirect here would run before the page decides).
  if (!session) return <div className="theme-app font-body">{children}</div>;

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
