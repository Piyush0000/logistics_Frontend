'use client';

import { useId } from 'react';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { statusLabel } from '@/lib/format/status';
import type { NotifyEvent } from '@/lib/data/notifications/types';
import { renderTemplate, smsParts, unknownVariables } from '@/lib/templates';

/** Invented values, so the preview shows the shape of a real message and never a real buyer. */
export const SAMPLE_VALUES: Record<string, string> = {
  buyer_name: 'Asha Rao',
  awb: 'EK1234567890',
  courier: 'Ekart',
  tracking_link: 'https://example.com/track/EK1234567890',
  store_name: 'Blue Shop',
};

/** The message for one event, with a live preview. The preview is text: it is never read as HTML. */
export function TemplateEditor({
  event,
  value,
  error,
  disabled,
  onChange,
}: {
  event: NotifyEvent;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const unknown = unknownVariables(value);
  // Each unknown variable gets its own line. Another problem, such as an empty message, shows only when there is none.
  const problems = unknown.length > 0 ? unknown.map((v) => `Unknown variable: ${v}`) : error ? [error] : [];
  const parts = smsParts(value);

  return (
    <div data-testid={`template-${event}`} className="min-w-0 rounded-control border border-secondary p-3">
      <label htmlFor={id} className={FIELD_LABEL}>
        {`Message for ${statusLabel(event)}`}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={problems.length > 0 ? true : undefined}
        aria-describedby={`${id}-help`}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-28 w-full min-w-0 rounded-control border bg-surface px-3 py-2 text-base [overflow-wrap:anywhere] lg:text-sm ${
          problems.length > 0 ? 'border-error' : 'border-secondary'
        }`}
      />
      <div id={`${id}-help`} className="mt-1 grid gap-1 text-xs text-on-surface/70">
        {problems.map((problem) => (
          <p key={problem} className="text-sm text-on-surface">
            {problem}
          </p>
        ))}
        <p data-testid={`parts-${event}`}>
          {value.length} {value.length === 1 ? 'character' : 'characters'}.{' '}
          {parts > 0 ? `Sends as ${parts} ${parts === 1 ? 'message' : 'messages'} by SMS.` : ''}
        </p>
      </div>
      <p className="mt-3 text-xs font-medium text-on-surface/70">Preview</p>
      <p
        data-testid={`preview-${event}`}
        className="mt-1 rounded-control bg-muted p-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]"
      >
        {renderTemplate(value, SAMPLE_VALUES)}
      </p>
    </div>
  );
}
