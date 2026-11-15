'use client';

import { X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

/** A popup built on the browser's dialog, which handles focus, Escape and the backdrop. */
export function Dialog({
  title,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Closing it here, not just removing it, puts focus back on the button that opened it.
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      // React's dev mode starts this component twice, which closes and reopens the dialog.
      // Only a dialog that is really still closed counts as the person closing it.
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      // Desktop: a centred card. Below 64rem: a bottom sheet that slides up, with a grab handle.
      className={`m-auto w-[calc(100vw-2rem)] rounded-card border border-secondary bg-surface p-card text-on-surface shadow-[0_24px_60px_rgb(7_11_22/0.25)] backdrop:bg-[#070b16]/55 backdrop:backdrop-blur-[2px] lg:animate-[evoc-rise_250ms_var(--ease-evoc)] max-lg:mb-0 max-lg:max-h-[90dvh] max-lg:w-full max-lg:max-w-full max-lg:animate-[evoc-sheet-up_250ms_var(--ease-evoc)] max-lg:rounded-b-none max-lg:rounded-t-[20px] max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] ${
        wide ? 'lg:max-w-3xl' : 'lg:max-w-lg'
      }`}
    >
      <span aria-hidden="true" className="mx-auto -mt-2 mb-3 block h-1.5 w-10 rounded-full bg-secondary lg:hidden" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close popup"
          onClick={onClose}
          className="grid size-control shrink-0 place-items-center rounded-control hover:bg-muted"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export const PRIMARY_BUTTON =
  'inline-flex h-control items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-[background-color,transform] duration-150 enabled:hover:bg-accent enabled:active:scale-[.97] disabled:bg-primary/50';

export const SECONDARY_BUTTON =
  'inline-flex h-control items-center justify-center gap-2 rounded-control border border-secondary bg-surface px-4 text-sm font-medium transition-[background-color,border-color,transform] duration-150 enabled:hover:border-primary/40 enabled:hover:bg-muted enabled:active:scale-[.97] disabled:text-on-surface/60';
