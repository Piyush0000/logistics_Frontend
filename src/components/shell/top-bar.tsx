'use client';

import { ChevronDown, Menu, RefreshCw, WandSparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition, type ReactNode, type Ref } from 'react';
import { signOutAction } from '@/app/(auth)/login/actions';
import { BrandMark } from '@/components/brand-mark';
import type { DataResult } from '@/lib/data/source';
import type { WalletBalance } from '@/lib/data/wallet';
import { formatPaise } from '@/lib/format/money';
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
          className="absolute top-full right-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-card border border-secondary bg-surface p-3 shadow-lg shadow-muted"
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
          className="flex h-control items-center gap-2 rounded-control border border-secondary bg-surface px-3 text-sm font-medium hover:border-primary"
        >
          <WandSparkles aria-hidden="true" className="size-4" />
          Quick
        </button>
      )}
    >
      <button
        type="button"
        role="menuitem"
        disabled
        className="w-full cursor-not-allowed rounded-control px-2 py-1 text-left text-sm text-on-surface/70"
      >
        Create shipment
      </button>
      <p className="px-2 text-xs text-on-surface/70">Not available yet.</p>
    </Dropdown>
  );
}

function Wallet({ wallet }: { wallet: DataResult<WalletBalance> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex">
      <div
        data-testid="wallet"
        className="flex h-control flex-col items-end justify-center rounded-l-control bg-primary px-3 text-tertiary lg:flex-row lg:items-center lg:gap-2"
      >
        <span className="text-sm leading-4 font-semibold">
          {wallet.ok ? formatPaise(wallet.data.availablePaise) : 'Unavailable'}
        </span>
        {wallet.source === 'mock' ? (
          <span className="text-[10px] leading-3 text-tertiary/80">Sample</span>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Refresh balance"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="grid h-control w-11 place-items-center rounded-r-control border border-l-0 border-secondary bg-surface hover:text-primary lg:w-9"
      >
        <RefreshCw aria-hidden="true" className={`size-4 ${pending ? 'animate-spin' : ''}`} />
      </button>
    </div>
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
      <form action={signOutAction} className="mt-2">
        <button
          type="submit"
          className="h-control w-full rounded-control bg-primary px-3 text-sm font-medium text-tertiary"
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
  wallet: DataResult<WalletBalance>;
  menuButtonRef: Ref<HTMLButtonElement>;
  onOpenMenu: () => void;
}) {
  return (
    <header className="relative z-20 border-b border-secondary bg-surface lg:sticky lg:top-0">
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
        <span className="rounded-control bg-primary text-tertiary max-[359px]:hidden lg:hidden">
          <BrandMark compact />
        </span>

        <div className="order-last flex w-full min-w-0 items-center gap-2 lg:order-none lg:w-auto lg:flex-1 lg:gap-3">
          <AwbSearch />
          <QuickMenu />
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          <Wallet wallet={wallet} />
          <AccountMenu email={email} />
        </div>
      </div>
    </header>
  );
}
