import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand-mark';

/** Pages buyers open from a shared link: no sign-in and no app shell, only the brand. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-app flex min-h-dvh flex-col bg-surface font-body">
      <header className="bg-primary px-4 py-3 text-tertiary sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <BrandMark />
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
