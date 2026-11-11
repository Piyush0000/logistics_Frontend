import type { ReactNode } from 'react';
import { ShellIdentityProvider } from '@/components/shell/shell-identity';
import { getDemoSession } from '@/lib/auth/session';

/** Signed-in screens follow sharkship.in-design.md. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getDemoSession();
  return (
    <ShellIdentityProvider email={session?.email ?? null}>
      <div className="theme-app font-body">{children}</div>
    </ShellIdentityProvider>
  );
}
