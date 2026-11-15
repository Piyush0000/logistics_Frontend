import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/brand-mark';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { adminConfig, DEMO_ADMIN } from '@/lib/admin/credentials';
import { getAdminSession } from '@/lib/admin/session';
import { AdminLoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin');
  const config = adminConfig();
  // The hint is for local development only; a production page never prints a password.
  const isDemo =
    process.env.NODE_ENV !== 'production' &&
    config?.email === DEMO_ADMIN.email &&
    config.password === DEMO_ADMIN.password;

  return (
    <main className="grid min-h-dvh place-items-center bg-tertiary p-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle variant="icon" />
      </div>
      <section className="motion-rise w-full max-w-sm rounded-card border border-secondary bg-surface p-6 shadow-[var(--shadow-lift)]">
        <div>
          <BrandMark />
        </div>
        <span className="mt-3 inline-flex rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-on-primary uppercase">
          Admin
        </span>
        <h1 className="mt-4 font-heading text-2xl leading-8 font-extrabold tracking-tight">Sign in to the admin panel</h1>
        <p className="mt-1 text-sm text-on-surface/70">For the Evoc Ships founder only.</p>

        {config ? (
          <AdminLoginForm />
        ) : (
          <p role="alert" className="mt-5 rounded-control bg-error/10 p-3 text-sm text-error">
            Admin sign-in is not set up on this server. Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.
          </p>
        )}

        {isDemo ? (
          <p data-testid="admin-demo-hint" className="mt-4 rounded-control bg-muted p-3 text-xs leading-5 text-primary">
            Local demo account: <span className="font-mono">{DEMO_ADMIN.email}</span> /{' '}
            <span className="font-mono">{DEMO_ADMIN.password}</span>. Never used in production.
          </p>
        ) : null}
      </section>
    </main>
  );
}
