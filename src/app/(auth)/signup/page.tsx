import { Info } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { BrandPanel } from '../login/brand-panel';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Create account | Evoc Ships' };

export default async function SignupPage() {
  if (await getDemoSession()) redirect('/dashboard');

  return (
    <main className="flex min-h-dvh items-stretch justify-center sm:items-center sm:p-6 lg:p-8">
      <div className="grid w-full max-w-[1120px] grid-rows-[auto_1fr] overflow-hidden bg-surface sm:rounded-card sm:border sm:border-secondary sm:shadow-2xl sm:shadow-muted lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-1">
        <BrandPanel />
        <section
          data-testid="signup-section"
          className="flex flex-col justify-center px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-8 lg:px-12 lg:py-10"
        >
          <div
            data-testid="signup-content"
            className="mx-auto w-full max-w-md text-center sm:max-w-none sm:text-start"
          >
            <p className="text-xs leading-none font-bold tracking-[0.06em] text-primary">
              Workspace access
            </p>
            <h1 className="mt-3 font-heading text-[27px] leading-8 font-extrabold text-primary sm:text-[34px] sm:leading-[41px]">
              Create your account
            </h1>
            <p className="mt-2 text-base leading-[26px] text-on-surface/70">
              Set up your workspace in a minute. A checklist on Home guides the rest.
            </p>

            <div className="mt-5 grid gap-4 text-left sm:mt-6 sm:rounded-card sm:border sm:border-secondary sm:p-6">
              <p className="mx-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs leading-4 font-extrabold tracking-[0.02em] text-primary sm:mx-0">
                <Info aria-hidden="true" className="size-4 shrink-0" />
                Demo mode: no account is created or stored, and any email works.
              </p>
              <SignupForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
