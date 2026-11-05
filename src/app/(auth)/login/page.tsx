import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { BrandPanel } from './brand-panel';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in | Evoc Logistics' };

export default async function LoginPage() {
  if (await getDemoSession()) redirect('/dashboard');

  return (
    <main className="flex min-h-dvh items-stretch justify-center sm:items-center sm:p-6 lg:p-8">
      <div className="grid w-full max-w-[1120px] grid-rows-[auto_1fr] overflow-hidden bg-surface sm:rounded-card sm:border sm:border-secondary sm:shadow-2xl sm:shadow-muted lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-1">
        <BrandPanel />
        <section
          data-testid="login-section"
          className="flex flex-col justify-center px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-8 lg:px-12 lg:py-10"
        >
          <div
            data-testid="login-content"
            className="mx-auto w-full max-w-md text-center sm:max-w-none sm:text-start"
          >
            <p className="text-xs leading-none font-bold tracking-[0.06em] text-primary">
              Workspace access
            </p>
            <h1 className="mt-3 font-heading text-[27px] leading-8 font-extrabold text-primary sm:text-[34px] sm:leading-[41px]">
              Sign in to your workspace
            </h1>
            <p className="mt-2 hidden text-base leading-[26px] text-on-surface/70 sm:block">
              Continue with a one-time code or your password. New users can register the same way.
            </p>

            <div className="mt-5 grid gap-4 text-left sm:mt-6 sm:rounded-card sm:border sm:border-secondary sm:p-6">
              <p className="mx-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs leading-4 font-extrabold tracking-[0.02em] text-primary sm:mx-0">
                <Info aria-hidden="true" className="size-4" />
                Demo sign-in: no email is sent
              </p>
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
