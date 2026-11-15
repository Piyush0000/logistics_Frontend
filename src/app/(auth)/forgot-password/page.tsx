import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { BrandPanel } from '../login/brand-panel';
import { ForgotForm } from './forgot-form';

export const metadata: Metadata = { title: 'Reset password | Evoc Ships' };

export default async function ForgotPasswordPage() {
  if (await getDemoSession()) redirect('/dashboard');

  return (
    <main className="flex min-h-dvh items-stretch justify-center sm:items-center sm:p-6 lg:p-8">
      <div className="grid w-full max-w-[1120px] grid-rows-[auto_1fr] overflow-hidden bg-surface sm:rounded-card sm:border sm:border-secondary sm:shadow-2xl sm:shadow-muted lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-1">
        <BrandPanel />
        <section
          data-testid="forgot-section"
          className="flex flex-col justify-center px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-8 lg:px-12 lg:py-10"
        >
          <div
            data-testid="forgot-content"
            className="mx-auto w-full max-w-md text-center sm:max-w-none sm:text-start"
          >
            <p className="text-xs leading-none font-bold tracking-[0.06em] text-primary">
              Workspace access
            </p>
            <h1 className="mt-3 font-heading text-[27px] leading-8 font-extrabold text-primary sm:text-[34px] sm:leading-[41px]">
              Reset your password
            </h1>
            <p className="mt-2 text-base leading-[26px] text-on-surface/70">
              Enter your work email and we will send a link to choose a new password.
            </p>

            <div className="mt-5 grid gap-4 text-left sm:mt-6 sm:rounded-card sm:border sm:border-secondary sm:p-6">
              <ForgotForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
