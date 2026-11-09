'use client';

import { Pencil, Plus, Trash2, Webhook as WebhookIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { Webhook } from '@/lib/data/webhooks/types';
import { formatDateTime } from '@/lib/format/date';
import { deleteWebhookAction } from './actions';
import { CopyButton } from './copy-button';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from './dialog';
import { WebhookForm } from './webhook-form';

type OpenDialog =
  | { kind: 'create' }
  | { kind: 'edit'; webhook: Webhook }
  | { kind: 'delete'; webhook: Webhook }
  | { kind: 'secret'; secret: string };

const ICON_BUTTON =
  'grid size-control shrink-0 place-items-center rounded-control border border-secondary hover:bg-muted';

const STATUS_TONES = {
  ACTIVE: { label: 'Active', tone: 'border-success/40 bg-success/10' },
  PAUSED: { label: 'Paused', tone: 'border-warning/40 bg-warning/10' },
};

function WebhookRow({
  webhook,
  onEdit,
  onDelete,
}: {
  webhook: Webhook;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { label, tone } = STATUS_TONES[webhook.status];

  return (
    <li
      data-testid="webhook-row"
      className="flex items-start gap-3 border-b border-secondary py-4 first:pt-0 last:border-b-0 last:pb-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 font-medium [overflow-wrap:anywhere]">{webhook.url}</p>
        <ul className="mt-2 flex flex-wrap items-center gap-1.5">
          <li>
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${tone}`}>
              {label}
            </span>
          </li>
          {webhook.events.map((event) => (
            <li key={event}>
              <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-primary [overflow-wrap:anywhere]">
                {event}
              </span>
            </li>
          ))}
        </ul>
        {webhook.failureStartedAt ? (
          <p className="mt-2 text-xs leading-4 text-on-surface/70">
            Failing since {formatDateTime(webhook.failureStartedAt)}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          aria-label={`Edit ${webhook.url}`}
          onClick={onEdit}
          className={ICON_BUTTON}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${webhook.url}`}
          onClick={onDelete}
          className={ICON_BUTTON}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  );
}

function SecretDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
  return (
    <Dialog title="Save your signing secret" onClose={onClose}>
      <p className="rounded-control border border-warning/40 bg-warning/10 p-3 text-sm">
        Copy this secret now and keep it safe. You will not see it again.
      </p>
      <p
        data-testid="signing-secret"
        className="mt-3 rounded-control bg-tertiary p-3 font-mono text-sm break-all"
      >
        {secret}
      </p>
      <p className="mt-3 text-sm text-on-surface/70">
        Use it to check the signature on every webhook you receive.
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <CopyButton label="Copy secret" text={secret} />
        <button type="button" onClick={onClose} className={PRIMARY_BUTTON}>
          Done
        </button>
      </div>
    </Dialog>
  );
}

function DeleteDialog({ webhook, onClose }: { webhook: Webhook; onClose: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteWebhookAction(webhook.id);
      if (result.ok) onClose();
      else setMessage(result.message);
    });
  }

  return (
    <Dialog title="Delete Webhook" onClose={onClose}>
      <p className="text-sm">This stops all deliveries to this address, and cannot be undone.</p>
      <p className="mt-2 text-sm font-medium [overflow-wrap:anywhere]">{webhook.url}</p>
      {message ? (
        <p role="alert" className="mt-3 rounded-control bg-error/10 p-3 text-sm">
          {message}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-3">
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className={`${SECONDARY_BUTTON} border-error bg-error/10`}
        >
          Delete
        </button>
      </div>
    </Dialog>
  );
}

export function WebhooksPanel({ webhooks }: { webhooks: Webhook[] }) {
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setDialog({ kind: 'create' })}
          className={`${PRIMARY_BUTTON} w-full sm:w-auto`}
        >
          <Plus aria-hidden="true" className="size-4" />
          Create Webhook
        </button>
      </div>

      {webhooks.length ? (
        <ul>
          {webhooks.map((webhook) => (
            <WebhookRow
              key={webhook.id}
              webhook={webhook}
              onEdit={() => setDialog({ kind: 'edit', webhook })}
              onDelete={() => setDialog({ kind: 'delete', webhook })}
            />
          ))}
        </ul>
      ) : (
        <div className="grid justify-items-center gap-2 py-10 text-center">
          <WebhookIcon aria-hidden="true" className="size-8 text-primary" />
          <p className="text-sm">No webhooks yet. Create one to start receiving events.</p>
        </div>
      )}

      {dialog?.kind === 'create' ? (
        <WebhookForm
          onClose={close}
          onCreated={(secret) => setDialog({ kind: 'secret', secret })}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <WebhookForm webhook={dialog.webhook} onClose={close} onCreated={close} />
      ) : null}
      {dialog?.kind === 'delete' ? <DeleteDialog webhook={dialog.webhook} onClose={close} /> : null}
      {dialog?.kind === 'secret' ? <SecretDialog secret={dialog.secret} onClose={close} /> : null}
    </>
  );
}
