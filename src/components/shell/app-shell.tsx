'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DataResult } from '@/lib/data/source';
import type { WalletBalance } from '@/lib/data/wallet';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { useDismiss } from './use-dismiss';

export function AppShell({
  email,
  wallet,
  children,
}: {
  email: string;
  wallet: DataResult<WalletBalance>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    menuButton.current?.focus();
  }, []);

  useDismiss(panel, open, close);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();

    // Only the phone menu covers the page, so only it stops the page scrolling behind it.
    if (!window.matchMedia('(max-width: 63.99rem)').matches) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="min-h-dvh">
      <Sidebar
        email={email}
        open={open}
        panelRef={panel}
        closeButtonRef={closeButton}
        onToggle={() => setOpen((current) => !current)}
        onClose={close}
      />
      {open ? (
        <div
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-on-surface/50 lg:hidden"
        />
      ) : null}
      <div className="min-w-0 lg:pl-20">
        <TopBar
          email={email}
          wallet={wallet}
          menuButtonRef={menuButton}
          onOpenMenu={() => setOpen(true)}
        />
        <main className="mx-auto grid w-full max-w-[1760px] grid-cols-[minmax(0,1fr)] gap-4 p-4 lg:gap-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
