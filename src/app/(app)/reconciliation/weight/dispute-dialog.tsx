'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { checkDispute, MAX_NOTE_LENGTH } from '@/lib/data/weight/input';
import type { EvidenceFile, WeightDiscrepancy } from '@/lib/data/weight/types';
import { disputeDiscrepancyAction } from './actions';

const FIELD =
  'w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none';

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Asks for a note and 1 to 3 images, then disputes one charge. Only each file's name, type and size are sent. */
export function DisputeDialog({
  item,
  onClose,
  onDisputed,
}: {
  item: WeightDiscrepancy;
  onClose: () => void;
  onDisputed: (message: string) => void;
}) {
  const noteId = useId();
  const filesId = useId();
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const evidence: EvidenceFile[] = files.map(({ name, type, size }) => ({ name, type, size }));
    // The server checks all of this again. Checking here answers without a round trip.
    const problem = checkDispute({ note, evidence });
    if (problem) {
      setMessage(problem);
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await disputeDiscrepancyAction({ id: item.id, note, evidence });
      if (result.ok) onDisputed(result.message);
      else setMessage(result.message);
    });
  }

  return (
    <Dialog title="Dispute weight charge" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-5">
        <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">
          Shipment {item.awb}. Tell the courier why the declared weight is right, and add photos of
          the parcel on a scale or its packaging.
        </p>

        <div>
          <label htmlFor={noteId} className={FIELD_LABEL}>
            Note
          </label>
          <textarea
            id={noteId}
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`${FIELD} py-2.5`}
          />
          <p className="mt-1 text-xs text-on-surface/60">
            10 to 1,000 characters. {note.trim().length.toLocaleString('en-IN')} of{' '}
            {MAX_NOTE_LENGTH.toLocaleString('en-IN')} used.
          </p>
        </div>

        <div>
          <label htmlFor={filesId} className={FIELD_LABEL}>
            Evidence images
          </label>
          <input
            id={filesId}
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className={`${FIELD} min-h-11 py-2 file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary`}
          />
          <p className="mt-1 text-xs text-on-surface/60">1 to 3 images, JPG or PNG, up to 5 MB each.</p>
          {files.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-sm">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="[overflow-wrap:anywhere]">
                  {file.name} <span className="text-on-surface/60">({formatSize(file.size)})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
            Send dispute
          </button>
        </div>
      </form>
    </Dialog>
  );
}
