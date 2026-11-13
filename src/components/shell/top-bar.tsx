'use client';

import { ChevronDown, Menu, WandSparkles } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState, type ReactNode, type Ref } from 'react';
import { signOutAction } from '@/app/(auth)/login/actions';
import { BrandMark } from '@/components/brand-mark';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { userLabel } from '@/lib/format/user';
import { AwbSearch } from './awb-search';
import { useDismiss } from './use-dismiss';

function Dropdown({
  trigger,
  children,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(container, open, close);

  return (
    <div ref={container} className="relative">
      {trigger({ open, toggle: () => setOpen((current) => !current) })}
      {open ? (
        <div
          role="menu"
          className="motion-rise absolute top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-secondary bg-surface p-3 shadow-[0_16px_40px_rgb(7_11_22/0.18)]"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function QuickMenu() {
  return (
    <Dropdown
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-control items-center gap-2 rounded-control border border-secondary bg-surface px-3 text-sm font-medium transition-colors duration-150 hover:border-primary hover:text-primary active:scale-[.97]"
        >
          <WandSparkles aria-hidden="true" className="size-4" />
          Quick
        </button>
      )}
    >
      <Link
        href="/orders/create"
        role="menuitem"
        className="flex min-h-11 w-full items-center rounded-control px-2 text-left text-sm font-medium text-on-surface hover:bg-muted hover:text-primary lg:min-h-9"
      >
        Create shipment
      </Link>
    </Dropdown>
  );
}

function AccountMenu({ email }: { email: string }) {
  const { name, initials } = userLabel(email);

  return (
    <Dropdown
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-control min-w-11 items-center justify-center gap-2 rounded-control"
        >
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium text-primary">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-sm lg:block">{name}</span>
          <ChevronDown aria-hidden="true" className="hidden size-4 lg:block" />
        </button>
      )}
    >
      <p className="px-2 text-sm break-all">Signed in as {email}</p>
      <div className="mt-3">
        <ThemeToggle variant="menu" />
      </div>
      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="h-control w-full rounded-control bg-primary px-3 text-sm font-medium text-on-primary"
        >
          Sign out
        </button>
      </form>
    </Dropdown>
  );
}

export function TopBar({
  email,
  wallet,
  menuButtonRef,
  onOpenMenu,
}: {
  email: string;
  wallet: ReactNode;
  menuButtonRef: Ref<HTMLButtonElement>;
  onOpenMenu: () => void;
}) {
  return (
    <header className="relative z-20 border-b border-secondary bg-surface/85 backdrop-blur-md lg:sticky lg:top-0">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 lg:flex-nowrap lg:gap-3 lg:px-8 lg:py-3">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="grid size-11 place-items-center rounded-control lg:hidden"
        >
          <Menu aria-hidden="true" className="size-6" />
        </button>
        <span className="max-[359px]:hidden lg:hidden">
          <BrandMark compact />
        </span>

        <div className="order-last flex w-full min-w-0 items-center gap-2 lg:order-none lg:w-auto lg:flex-1 lg:gap-3">
          <AwbSearch />
          <QuickMenu />
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          {wallet}
          <AccountMenu email={email} />
        </div>
      </div>
    </header>
  );
}
