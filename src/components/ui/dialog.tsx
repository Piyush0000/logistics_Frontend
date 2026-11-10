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
      className={`m-auto w-[calc(100vw-2rem)] rounded-card bg-surface p-card text-on-surface shadow-md backdrop:bg-on-surface/50 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-full max-sm:rounded-none ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="font-heading text-xl leading-7">
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
  'inline-flex h-control items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-tertiary disabled:bg-primary/50';

export const SECONDARY_BUTTON =
  'inline-flex h-control items-center justify-center gap-2 rounded-control border border-secondary px-4 text-sm font-medium hover:bg-muted disabled:text-on-surface/60';
