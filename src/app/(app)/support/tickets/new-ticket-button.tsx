'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { NewTicketDialog } from './new-ticket-dialog';

/**
 * The New ticket button and its dialog. `startOpen` is the `?new=1` link from the Help Centre.
 * Closing a dialog that link opened also drops `?new=1`, so a refresh does not open it again.
 */
export function NewTicketButton({ startOpen, closeHref }: { startOpen: boolean; closeHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);

  function close() {
    setOpen(false);
    if (startOpen) router.replace(closeHref);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${PRIMARY_BUTTON} min-h-11 lg:min-h-0`}>
        <Plus aria-hidden="true" className="size-4" />
        New ticket
      </button>
      {open ? <NewTicketDialog onClose={close} fromLink={startOpen} /> : null}
    </>
  );
}
