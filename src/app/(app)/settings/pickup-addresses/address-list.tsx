'use client';

import { Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { MAX_PICKUP_ADDRESSES, type PickupAddress } from '@/lib/data/pickup-addresses/types';
import { deletePickupAddressAction, makeDefaultPickupAddressAction } from './actions';
import { AddressForm } from './address-form';

type Open =
  | { kind: 'form'; entry?: PickupAddress }
  | { kind: 'delete'; entry: PickupAddress }
  | null;

const ACTION = `${SECONDARY_BUTTON} min-h-11`;

function DeleteDialog({
  entry,
  onClose,
  onDeleted,
}: {
  entry: PickupAddress;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setMessage(null);
    startTransition(async () => {
      const result = await deletePickupAddressAction(entry.id);
      if (result.ok) onDeleted();
      else setMessage(result.message);
    });
  }

  return (
    <Dialog title="Delete pickup address" onClose={onClose}>
      <div className="grid gap-4">
        <p className="min-w-0 text-sm break-words">
          Delete {entry.label}? Shipments already booked from it are not changed.
        </p>
        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={ACTION}>
            Cancel
          </button>
          <button type="button" disabled={pending} onClick={confirm} className={`${PRIMARY_BUTTON} min-h-11`}>
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** The saved addresses as cards, with add, edit, make default and delete. */
export function AddressList({ addresses }: { addresses: PickupAddress[] }) {
  const [open, setOpen] = useState<Open>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = addresses.length >= MAX_PICKUP_ADDRESSES;

  function makeDefault(entry: PickupAddress) {
    setStatus(null);
    setError(null);
    startTransition(async () => {
      const result = await makeDefaultPickupAddressAction(entry.id);
      if (result.ok) setStatus(result.message);
      else setError(result.message);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface/70">
          {addresses.length} of {MAX_PICKUP_ADDRESSES} saved. One is your default.
        </p>
        <button
          type="button"
          disabled={full}
          onClick={() => setOpen({ kind: 'form' })}
          className={`${PRIMARY_BUTTON} min-h-11`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add address
        </button>
      </div>
      {full ? (
        <p className="text-sm">You have saved {MAX_PICKUP_ADDRESSES} addresses. Delete one to add another.</p>
      ) : null}

      {status ? (
        <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
          {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
          {error}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <EmptyState message="You have no saved pickup addresses. Add one so couriers know where to collect." />
      ) : (
        <ul className="motion-stagger grid gap-3 xl:grid-cols-2">
          {addresses.map((entry) => (
            <li
              key={entry.id}
              data-testid="address-item"
              className="grid min-w-0 content-start gap-3 rounded-control border border-secondary p-3 transition-colors duration-150 hover:bg-muted/40 lg:p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="min-w-0 font-heading text-base leading-6 font-bold tracking-tight break-words lg:text-lg">{entry.label}</h3>
                {entry.isDefault ? (
                  <span className="shrink-0 rounded-control bg-muted px-2 py-0.5 text-xs font-medium text-primary">
                    Default
                  </span>
                ) : null}
              </div>
              <address className="min-w-0 text-sm not-italic break-words text-on-surface/80">
                <span className="font-medium text-on-surface">{entry.address.name}</span>, {entry.address.phone}
                <br />
                {entry.address.line1}
                {entry.address.line2 ? `, ${entry.address.line2}` : ''}
                <br />
                {entry.address.city}, {entry.address.state} {entry.address.pincode}
              </address>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${entry.label}`}
                  onClick={() => setOpen({ kind: 'form', entry })}
                  className={ACTION}
                >
                  Edit
                </button>
                {entry.isDefault ? null : (
                  <button
                    type="button"
                    aria-label={`Make ${entry.label} default`}
                    disabled={pending}
                    onClick={() => makeDefault(entry)}
                    className={ACTION}
                  >
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Delete ${entry.label}`}
                  onClick={() => setOpen({ kind: 'delete', entry })}
                  className={ACTION}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open?.kind === 'form' ? (
        <AddressForm
          entry={open.entry}
          isOnlyAddress={addresses.length === 0}
          onClose={() => setOpen(null)}
          onSaved={(message) => {
            setOpen(null);
            setError(null);
            setStatus(message);
          }}
        />
      ) : null}
      {open?.kind === 'delete' ? (
        <DeleteDialog
          entry={open.entry}
          onClose={() => setOpen(null)}
          onDeleted={() => {
            setOpen(null);
            setError(null);
            setStatus('Address deleted.');
          }}
        />
      ) : null}
    </div>
  );
}
