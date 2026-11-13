'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { MAX_PRESETS } from '@/lib/data/weight-settings/input';
import type { PackagePreset } from '@/lib/data/weight-settings/types';
import { chargeableWeightKg } from '@/lib/volumetric';
import { deletePresetAction } from './actions';
import { formatKg, PresetFormDialog } from './preset-form-dialog';

const number = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const size = (p: PackagePreset) => `${number(p.lengthCm)} × ${number(p.widthCm)} × ${number(p.heightCm)} cm`;

const TABLE_BUTTON =
  'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-xs font-medium whitespace-nowrap';
const CARD_BUTTON =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border px-4 text-sm font-medium';
const EDIT = 'border-secondary bg-surface hover:border-primary hover:text-primary';
const DELETE = 'border-secondary bg-surface hover:border-error';

function DefaultBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-0.5 text-xs leading-4 font-medium text-primary">
      Default
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function DeleteDialog({
  preset,
  others,
  onClose,
  onDeleted,
}: {
  preset: PackagePreset;
  others: number;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setMessage(null);
    startTransition(async () => {
      const result = await deletePresetAction(preset.id);
      if (result.ok) onDeleted(result.message);
      else setMessage(result.message);
    });
  }

  return (
    <Dialog title="Delete preset" onClose={onClose}>
      <div className="grid gap-5">
        <p className="text-sm [overflow-wrap:anywhere]">
          Delete <strong>{preset.name}</strong>? This cannot be undone.
        </p>
        {preset.isDefault && others > 0 ? (
          <p className="text-sm text-on-surface/70">
            This is your default preset, so it can&apos;t be deleted while you have others. Make another
            preset the default first.
          </p>
        ) : null}
        {message ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {message}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="button" disabled={pending} onClick={confirm} className={PRIMARY_BUTTON}>
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** The saved presets as a table on desktop and cards on phones, with add, edit and delete. */
export function PackagePresets({ presets }: { presets: PackagePreset[] }) {
  // `null` is a new preset, a preset is an edit, `undefined` is closed.
  const [editing, setEditing] = useState<PackagePreset | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<PackagePreset | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const full = presets.length >= MAX_PRESETS;

  const actions = (preset: PackagePreset, layout: 'table' | 'card') => {
    const sizeClass = layout === 'table' ? TABLE_BUTTON : CARD_BUTTON;
    return (
      <div className={layout === 'table' ? 'flex items-center justify-end gap-2' : 'flex gap-2'}>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setEditing(preset);
          }}
          className={`${sizeClass} ${EDIT}`}
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit<span className="sr-only"> {preset.name}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setDeleting(preset);
          }}
          className={`${sizeClass} ${DELETE}`}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete<span className="sr-only"> {preset.name}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface/70">
          {presets.length} of {MAX_PRESETS} presets used.
          {full ? ' Delete one to add another.' : ''}
        </p>
        <button
          type="button"
          disabled={full}
          onClick={() => {
            setNotice(null);
            setEditing(null);
          }}
          className={`${PRIMARY_BUTTON} min-h-11 lg:min-h-0`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add preset
        </button>
      </div>

      {notice ? (
        <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
          {notice}
        </p>
      ) : null}

      {presets.length === 0 ? (
        <EmptyState message="You have no package presets yet. Add one to see what a courier would charge for it." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
            <table aria-label="Package presets" className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
                  <th scope="col" className="py-3.5 pr-4 pl-6">Name</th>
                  <th scope="col" className="px-4 py-3.5">Size</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Weight</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Chargeable weight</th>
                  <th scope="col" className="px-4 py-3.5">Default</th>
                  <th scope="col" className="py-3.5 pr-6 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary">
                {presets.map((preset) => (
                  <tr key={preset.id} data-testid="preset-row" className="hover:bg-tertiary/40">
                    <td className="max-w-72 py-4 pr-4 pl-6 font-medium [overflow-wrap:anywhere]">{preset.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap tabular-nums">{size(preset)}</td>
                    <td className="px-4 py-4 text-right whitespace-nowrap tabular-nums">{formatKg(preset.weightKg)}</td>
                    <td className="px-4 py-4 text-right font-medium whitespace-nowrap tabular-nums">
                      {formatKg(chargeableWeightKg(preset.weightKg, preset))}
                    </td>
                    <td className="px-4 py-4">{preset.isDefault ? <DefaultBadge /> : null}</td>
                    <td className="py-4 pr-6 pl-4">{actions(preset, 'table')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {presets.map((preset) => (
              <article
                key={preset.id}
                data-testid="preset-item"
                className="grid gap-3 rounded-card border border-secondary bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">{preset.name}</p>
                  {preset.isDefault ? <DefaultBadge /> : null}
                </div>
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-3 gap-y-2 text-sm">
                  <Fact label="Size" value={size(preset)} />
                  <Fact label="Weight" value={formatKg(preset.weightKg)} />
                  <Fact label="Chargeable weight" value={formatKg(chargeableWeightKg(preset.weightKg, preset))} />
                </dl>
                {actions(preset, 'card')}
              </article>
            ))}
          </div>
        </>
      )}

      {editing !== undefined ? (
        <PresetFormDialog
          preset={editing}
          presetCount={presets.length}
          onClose={() => setEditing(undefined)}
          onSaved={(message) => {
            setEditing(undefined);
            setNotice(message);
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteDialog
          preset={deleting}
          others={presets.length - 1}
          onClose={() => setDeleting(null)}
          onDeleted={(message) => {
            setDeleting(null);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}
