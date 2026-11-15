'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SECONDARY_BUTTON } from '@/components/ui/dialog';

/**
 * Copies `text`. Browsers refuse the clipboard on plain-HTTP pages, so when that happens the
 * text appears in a read-only field, already selected, ready for the person to copy by hand.
 */
export function CopyButton({ label, text, fieldLabel = 'Text to copy' }: { label: string; text: string; fieldLabel?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === 'failed') field.current?.select();
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="inline-grid max-w-full min-w-0 justify-items-start gap-2">
      <button type="button" onClick={copy} className={SECONDARY_BUTTON}>
        {state === 'copied' ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        {state === 'copied' ? 'Copied' : label}
      </button>
      {state === 'failed' ? (
        <div className="grid w-full min-w-0 gap-1">
          <input
            ref={field}
            readOnly
            aria-label={fieldLabel}
            value={text}
            onFocus={(event) => event.currentTarget.select()}
            className="h-control w-full min-w-0 rounded-control border border-secondary bg-surface px-3 text-base lg:text-sm"
          />
          <p className="text-xs text-on-surface/70">Could not copy automatically. Copy the selected text.</p>
        </div>
      ) : null}
    </div>
  );
}
