'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { adminSignOutAction } from '@/app/admin/actions';
import { BrandMark } from '@/components/brand-mark';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { activeAdminItem, ADMIN_NAV } from './admin-nav';

const ROW = 'flex h-11 w-full items-center gap-3 rounded-control px-3 text-[15px] transition-colors duration-150';
const ACTIVE = 'bg-muted font-semibold text-primary';
const IDLE = 'font-medium text-on-surface/70 hover:bg-tertiary hover:text-on-surface';

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeAdminItem(pathname);
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
        const selected = current?.href === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={selected ? 'page' : undefined}
            className={`${ROW} ${selected ? ACTIVE : IDLE}`}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SignOut() {
  return (
    <form action={adminSignOutAction}>
      <button
        type="submit"
        className="inline-flex h-11 items-center gap-2 rounded-control px-3 text-sm font-medium text-on-surface/70 transition-colors duration-150 hover:bg-tertiary hover:text-on-surface lg:h-control"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sign out
      </button>
    </form>
  );
}

/**
 * The admin panel's frame: a fixed menu on desktop, a slide-in menu on phones, and a top bar with
 * the theme switch and sign out. Separate from the merchant shell on purpose (different menu, no
 * wallet, no AWB search), but built from the same tokens and styles.
 */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = activeAdminItem(pathname)?.label ?? 'Admin';

  // Escape closes the phone menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-dvh">
      {/* Desktop menu */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r px-4 py-5 lg:flex print:hidden">
        <Link href="/admin" aria-label="Admin overview" className="block w-fit px-2">
          <BrandMark />
        </Link>
        <span className="mt-2 ml-2 inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-on-primary uppercase">
          Admin
        </span>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <p className="truncate border-t border-secondary px-2 pt-3 text-xs text-on-surface/60" title={email}>
          {email}
        </p>
      </aside>

      {/* Phone menu */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#070b16]/50 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="glass absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col border-r px-4 py-4"
          >
            <div className="flex items-center justify-between">
              <BrandMark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid size-11 place-items-center rounded-control"
              >
                <X aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              <AdminNav onNavigate={() => setOpen(false)} />
            </div>
            <p className="truncate border-t border-secondary pt-3 text-xs text-on-surface/60">{email}</p>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-64 print:pl-0">
        <header className="relative z-20 flex h-16 items-center gap-3 border-b border-secondary bg-surface/85 px-4 backdrop-blur-md lg:sticky lg:top-0 lg:px-8 print:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-11 place-items-center rounded-control lg:hidden"
          >
            <Menu aria-hidden="true" className="size-6" />
          </button>
          <p className="min-w-0 flex-1 truncate font-heading text-base font-bold tracking-tight lg:text-lg">{title}</p>
          <ThemeToggle variant="icon" />
          <SignOut />
        </header>
        <main className="mx-auto grid w-full max-w-[1600px] grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:gap-5 lg:p-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
