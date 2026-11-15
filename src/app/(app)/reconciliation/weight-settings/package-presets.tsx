'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition, type CSSProperties } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { tableStyles } from '@/components/ui/table-styles';
import { MAX_PRESETS } from '@/lib/data/weight-settings/input';
import type { PackagePreset } from '@/lib/data/weight-settings/types';
import { chargeableWeightKg } from '@/lib/volumetric';
import { deletePresetAction } from './actions';
import { formatKg, PresetFormDialog } from './preset-form-dialog';

const number = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const size = (p: PackagePreset) => `${number(p.lengthCm)} × ${number(p.widthCm)} × ${number(p.heightCm)} cm`;

const TABLE_BUTTON =
  'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150';
const CARD_BUTTON =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border px-4 text-sm font-medium transition-colors duration-150';
const EDIT = 'border-secondary bg-surface hover:border-primary/40 hover:bg-muted hover:text-primary';
const DELETE = 'border-secondary bg-surface hover:border-error/50 hover:bg-error/10 hover:text-error';

function DefaultBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-0.5 text-xs leading-4 font-semibold text-primary">
      Default
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-on-surface/60">{label}</dt>
      <dd className="font-mono font-medium tabular-nums [overflow-wrap:anywhere]">{value}</dd>
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
        <p role="status" className="rounded-control border border-success/30 bg-success/10 p-3 text-sm">
          {notice}
        </p>
      ) : null}

      {presets.length === 0 ? (
        <EmptyState message="You have no package presets yet. Add one to see what a courier would charge for it." />
      ) : (
        <>
          <div className={`${tableStyles.wrap} hidden lg:block`}>
            <table aria-label="Package presets" className={tableStyles.table}>
              <thead>
                <tr>
                  <th scope="col" className={tableStyles.th}>Name</th>
                  <th scope="col" className={tableStyles.th}>Size</th>
                  <th scope="col" className={`${tableStyles.th} text-right`}>Weight</th>
                  <th scope="col" className={`${tableStyles.th} text-right`}>Chargeable weight</th>
                  <th scope="col" className={tableStyles.th}>Default</th>
                  <th scope="col" className={`${tableStyles.th} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <tr
                    key={preset.id}
                    data-testid="preset-row"
                    className={`${tableStyles.rowHover} [&:last-child>td]:border-b-0`}
                  >
                    <td className={`${tableStyles.td} max-w-72 font-semibold [overflow-wrap:anywhere]`}>
                      {preset.name}
                    </td>
                    <td className={`${tableStyles.td} font-mono whitespace-nowrap tabular-nums`}>{size(preset)}</td>
                    <td className={`${tableStyles.tdNumeric} whitespace-nowrap`}>{formatKg(preset.weightKg)}</td>
                    <td className={`${tableStyles.tdNumeric} font-semibold whitespace-nowrap`}>
                      {formatKg(chargeableWeightKg(preset.weightKg, preset))}
                    </td>
                    <td className={tableStyles.td}>{preset.isDefault ? <DefaultBadge /> : null}</td>
                    <td className={tableStyles.td}>{actions(preset, 'table')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="motion-stagger grid gap-3 lg:hidden">
            {presets.map((preset, index) => (
              <article
                key={preset.id}
                data-testid="preset-item"
                style={{ '--i': index } as CSSProperties}
                className="grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-4"
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
