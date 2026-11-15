'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { BottomTabs } from './bottom-tabs';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { useDismiss } from './use-dismiss';

/** Hover-to-peek only where there is a real mouse and the desktop rail. */
const HOVER_QUERY = '(min-width: 64rem) and (hover: hover) and (pointer: fine)';
/** Resting on the rail this long opens it, so passing over it on the way elsewhere does not. */
const PEEK_OPEN_MS = 200;
/** A short grace period, so brushing past the edge does not snap it shut. */
const PEEK_CLOSE_MS = 150;

export function AppShell({
  email,
  wallet,
  children,
}: {
  email: string;
  /** The wallet chip, streamed in its own Suspense boundary by the layout. */
  wallet: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // `peek` is the desktop rail opened by hovering; `open` is the menu opened by a click.
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // After a click opens or closes the menu, hovering waits until the pointer has left the rail once.
  const waitForLeave = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const clearPeekTimer = useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = null;
  }, []);

  const endPeek = useCallback(() => {
    clearPeekTimer();
    setPeek(false);
    waitForLeave.current = true;
  }, [clearPeekTimer]);

  useEffect(() => clearPeekTimer, [clearPeekTimer]);

  const close = useCallback(() => {
    endPeek();
    setOpen(false);
    menuButton.current?.focus();
  }, [endPeek]);

  const toggle = () => {
    endPeek();
    setOpen((current) => !current);
  };

  const onPeekEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || open || waitForLeave.current) return;
    if (!window.matchMedia(HOVER_QUERY).matches) return;
    clearPeekTimer();
    peekTimer.current = setTimeout(() => setPeek(true), PEEK_OPEN_MS);
  };

  const onPeekLeave = () => {
    waitForLeave.current = false;
    clearPeekTimer();
    peekTimer.current = setTimeout(() => setPeek(false), PEEK_CLOSE_MS);
  };

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
        peek={peek}
        onPeekEnter={onPeekEnter}
        onPeekLeave={onPeekLeave}
        onToggle={toggle}
        onClose={close}
      />
      {open ? (
        <div
          data-testid="sidebar-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-[#070b16]/50 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}
      <div className="min-w-0 lg:pl-20 print:pl-0">
        <TopBar
          email={email}
          wallet={wallet}
          menuButtonRef={menuButton}
          onOpenMenu={() => setOpen(true)}
        />
        <main className="mx-auto grid w-full max-w-[1760px] grid-cols-[minmax(0,1fr)] gap-4 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:gap-5 lg:p-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
      <BottomTabs menuOpen={open} onOpenMenu={() => setOpen(true)} />
    </div>
  );
}
