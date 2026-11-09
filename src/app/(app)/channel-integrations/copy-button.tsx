'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { SECONDARY_BUTTON } from './dialog';

export function CopyButton({ label, text }: { label: string; text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      // Browsers can refuse clipboard access. The text is still on screen to select.
      setState('failed');
    }
  }

  return (
    <button type="button" onClick={copy} className={SECONDARY_BUTTON}>
      {state === 'copied' ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed, select the text' : label}
    </button>
  );
}
