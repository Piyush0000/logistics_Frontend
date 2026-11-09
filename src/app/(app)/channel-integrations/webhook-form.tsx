'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { WEBHOOK_EVENTS } from '@/lib/data/webhooks/events';
import type { Webhook, WebhookFieldErrors } from '@/lib/data/webhooks/types';
import { createWebhookAction, updateWebhookAction } from './actions';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from './dialog';

function EventSwitch({
  value,
  description,
  checked,
  onChange,
}: {
  value: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      data-testid={`event-${value}`}
      className="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 py-1 hover:bg-muted"
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className="flex h-5 w-9 shrink-0 items-center rounded-full bg-secondary p-0.5 peer-checked:justify-end peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        <span className="size-4 rounded-full bg-surface" />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-sm leading-5 [overflow-wrap:anywhere]">{value}</span>
        <span className="block text-xs leading-4 text-on-surface/70">{description}</span>
      </span>
    </label>
  );
}

export function WebhookForm({
  webhook,
  onClose,
  onCreated,
}: {
  /** The webhook to edit, or nothing to create a new one. */
  webhook?: Webhook;
  onClose: () => void;
  onCreated: (secret: string) => void;
}) {
  const id = useId();
  const [url, setUrl] = useState(webhook?.url ?? '');
  const [events, setEvents] = useState(webhook?.events ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<WebhookFieldErrors>({});
  const [pending, startTransition] = useTransition();

  function toggleEvent(event: string, checked: boolean) {
    setEvents((current) =>
      checked ? [...current, event] : current.filter((item) => item !== event),
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const input = { url, events };
      const result = webhook
        ? await updateWebhookAction(webhook.id, input)
        : await createWebhookAction(input);

      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      } else if ('secret' in result.data) {
        onCreated(result.data.secret);
      } else {
        onClose();
      }
    });
  }

  return (
    <Dialog title={webhook ? 'Edit Webhook' : 'Create Webhook'} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label htmlFor={`${id}-url`} className="mb-1 block text-sm font-medium">
            Webhook URL
          </label>
          <input
            id={`${id}-url`}
            type="url"
            value={url}
            placeholder="https://your-app.com/webhooks"
            autoComplete="off"
            aria-invalid={fieldErrors.url ? true : undefined}
            aria-describedby={fieldErrors.url ? `${id}-url-error` : undefined}
            onChange={(event) => setUrl(event.target.value)}
            className={`h-control w-full rounded-control border bg-surface px-3 text-sm ${
              fieldErrors.url ? 'border-error' : 'border-secondary'
            }`}
          />
          {fieldErrors.url ? (
            <p id={`${id}-url-error`} className="mt-1 text-sm">
              {fieldErrors.url}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Events to subscribe</legend>
          <div className="grid gap-1 rounded-control border border-secondary p-1">
            {WEBHOOK_EVENTS.map(({ value, description }) => (
              <EventSwitch
                key={value}
                value={value}
                description={description}
                checked={events.includes(value)}
                onChange={(checked) => toggleEvent(value, checked)}
              />
            ))}
          </div>
          {fieldErrors.events ? <p className="mt-1 text-sm">{fieldErrors.events}</p> : null}
        </fieldset>

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
            {webhook ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
