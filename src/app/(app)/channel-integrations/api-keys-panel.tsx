'use client';

import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import type { ApiKey } from '@/lib/data/api-keys/types';
import { MAX_KEY_NAME } from '@/lib/data/api-keys/types';
import { formatDate } from '@/lib/format/date';
import { createApiKeyAction, revokeApiKeyAction } from './actions';

const FIELD = 'h-control w-full min-w-0 rounded-control border border-secondary bg-surface px-3 text-base lg:text-sm';

function CreateDialog({ onClose }: { onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    start(async () => {
      const result = await createApiKeyAction(name);
      if (result.ok) setCreated(result.data.key);
      else setProblem(result.message);
    });
  }

  if (created) {
    return (
      <Dialog title="Your new API key" onClose={onClose}>
        <div className="grid gap-4">
          <p className="text-sm">
            Copy it now and keep it secret. It is shown only once; if you lose it, revoke it and create another.
          </p>
          <p data-testid="new-api-key" className="rounded-control bg-tertiary p-3 font-mono text-xs break-all">
            {created}
          </p>
          <p className="text-sm text-on-surface/70">
            Send it as <span className="font-mono">Authorization: Bearer &lt;key&gt;</span> to the Evoc Ships API.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <CopyButton label="Copy key" text={created} fieldLabel="API key" />
            <button type="button" onClick={onClose} className={PRIMARY_BUTTON}>
              Done
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Create an API key" onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div>
          <label htmlFor={id} className={FIELD_LABEL}>
            Name
          </label>
          <input
            id={id}
            value={name}
            maxLength={MAX_KEY_NAME}
            placeholder="For example: Shopify store"
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
          />
        </div>
        {problem ? (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {problem}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
            {pending ? 'Creating…' : 'Create key'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** The merchant's API keys: create (shown once) and revoke. */
export function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function revoke(key: ApiKey) {
    setFeedback(null);
    start(async () => {
      const result = await revokeApiKeyAction(key.id);
      setFeedback(result.ok ? `Revoked "${key.name}". Anything using it stops working now.` : result.message);
    });
  }

  return (
    <section aria-label="API Keys" className="motion-rise grid gap-4 rounded-card border border-secondary bg-surface p-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold">API keys</h2>
          <p className="text-sm text-on-surface/70">Connect your store or system to book and track shipments. Up to 10 active keys.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className={PRIMARY_BUTTON}>
          <Plus aria-hidden="true" className="size-4" />
          Create API key
        </button>
      </div>
      {feedback ? (
        <p role="status" className="rounded-control bg-tertiary p-3 text-sm">
          {feedback}
        </p>
      ) : null}
      {keys.length === 0 ? (
        <div className="grid justify-items-center gap-2 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-card bg-muted text-primary">
            <KeyRound aria-hidden="true" className="size-6" />
          </span>
          <p className="text-sm text-on-surface/70">No API keys yet.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {keys.map((key) => (
            <li
              key={key.id}
              data-testid="api-key-row"
              className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-secondary/70 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium [overflow-wrap:anywhere]">{key.name}</p>
                <p className="font-mono text-xs text-on-surface/70">
                  {key.prefix}… · created {formatDate(key.createdAt)} ·{' '}
                  {key.lastUsedAt ? `last used ${formatDate(key.lastUsedAt)}` : 'never used'}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => revoke(key)}
                aria-label={`Revoke ${key.name}`}
                className={SECONDARY_BUTTON}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {creating ? <CreateDialog onClose={() => setCreating(false)} /> : null}
    </section>
  );
}
