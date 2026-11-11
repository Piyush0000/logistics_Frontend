'use client';

import { useState, useTransition } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { parseNotificationInput, type NotificationFieldErrors } from '@/lib/data/notifications/input';
import {
  NOTIFY_EVENTS,
  type NotificationSettings,
  type NotifyChannel,
  type NotifyEvent,
} from '@/lib/data/notifications/types';
import { TEMPLATE_VARIABLES } from '@/lib/templates';
import { saveNotificationsAction } from './actions';
import { ChannelMatrix } from './channel-matrix';
import { TemplateEditor } from './template-editor';

/** Both parts share one state and one Save, so the matrix and the messages are always saved together. */
export function NotificationEditor({ initial }: { initial: NotificationSettings }) {
  const [settings, setSettings] = useState(initial);
  const [errors, setErrors] = useState<NotificationFieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(event: NotifyEvent, channel: NotifyChannel, on: boolean) {
    setFeedback(null);
    setSettings((current) => ({
      ...current,
      matrix: { ...current.matrix, [event]: { ...current.matrix[event], [channel]: on } },
    }));
  }

  function edit(event: NotifyEvent, text: string) {
    setFeedback(null);
    setErrors((current) => ({ ...current, [event]: undefined }));
    setSettings((current) => ({ ...current, templates: { ...current.templates, [event]: text } }));
  }

  function save() {
    setFeedback(null);
    // The same check the server runs, so a bad message is stopped here and never sent.
    const parsed = parseNotificationInput(settings);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setFeedback({ ok: false, message: 'Fix the highlighted messages, then save again.' });
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await saveNotificationsAction(parsed.value);
      setErrors(result.ok ? {} : (result.errors ?? {}));
      setFeedback({ ok: result.ok, message: result.message });
    });
  }

  return (
    <div className="grid gap-6">
      <section aria-labelledby="matrix-heading" className="grid gap-2">
        <h3 id="matrix-heading" className="font-heading text-lg leading-6">
          Channels
        </h3>
        <p className="text-sm text-on-surface/70">
          Turn on the channels that send a message when a parcel reaches each state.
        </p>
        <ChannelMatrix matrix={settings.matrix} onToggle={toggle} />
      </section>

      <section aria-labelledby="messages-heading" className="grid gap-3">
        <h3 id="messages-heading" className="font-heading text-lg leading-6">
          Messages
        </h3>
        <p className="text-sm text-on-surface/70">
          You can use these variables:{' '}
          <span data-testid="variables-list" className="inline-flex flex-wrap gap-x-2 gap-y-1">
            {TEMPLATE_VARIABLES.map((variable) => (
              <code key={variable} className="rounded-control bg-muted px-1 font-mono text-xs">
                {variable}
              </code>
            ))}
          </span>
        </p>
        {NOTIFY_EVENTS.map((event) => (
          <TemplateEditor
            key={event}
            event={event}
            value={settings.templates[event]}
            error={errors[event]}
            onChange={(text) => edit(event, text)}
          />
        ))}
      </section>

      {feedback ? (
        feedback.ok ? (
          <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
            {feedback.message}
          </p>
        ) : (
          <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
            {feedback.message}
          </p>
        )
      ) : null}

      <div>
        <button type="button" onClick={save} disabled={pending} className={PRIMARY_BUTTON}>
          Save notifications
        </button>
      </div>
    </div>
  );
}
