import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { SECTIONS } from '@/content/developers/reference';
import { DocsNav } from './docs-nav';

export const metadata: Metadata = {
  title: { default: 'Developers | Evoc Ships', template: '%s | Evoc Ships Developers' },
  description: 'Book, track and manage shipments from your own systems with the Evoc Ships API.',
};

const NAV = [
  { href: '/developers', label: 'Overview' },
  ...SECTIONS.map((s) => ({ href: `/developers/${s.slug}`, label: s.title })),
  { href: '/developers/webhooks', label: 'Webhooks' },
];

/** The public developer portal: readable without signing in, so developers can plan before they sign up. */
export default function DevelopersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-app flex min-h-dvh flex-col bg-tertiary font-body text-on-surface">
      <header className="glass sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-secondary px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <Link href="/developers" className="flex items-center gap-2" aria-label="Evoc Ships developers home">
            <BrandMark />
            <span className="rounded-full border border-secondary px-2 py-0.5 text-xs font-semibold">Developers</span>
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2 text-sm">
            <Link
              href="/channel-integrations"
              className="inline-flex h-11 items-center rounded-control px-3 font-medium hover:bg-muted max-sm:hidden lg:h-control"
            >
              API keys
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-control bg-primary px-4 font-medium text-on-primary hover:bg-primary/90 lg:h-control"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <DocsNav items={NAV} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
