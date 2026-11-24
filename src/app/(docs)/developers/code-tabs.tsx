'use client';

import { useId, useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';

/** One example in several languages, with a tab per language and a copy button. */
export function CodeTabs({ samples }: { samples: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const current = samples[active]!;
  return (
    <div className="min-w-0 overflow-hidden rounded-control border border-secondary bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-secondary px-2">
        <div role="tablist" aria-label="Language" className="flex">
          {samples.map((sample, index) => (
            <button
              key={sample.label}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(index)}
              className={`h-11 border-b-2 px-3 text-sm font-medium lg:h-9 ${
                index === active ? 'border-primary text-primary' : 'border-transparent text-on-surface/70 hover:text-on-surface'
              }`}
            >
              {sample.label}
            </button>
          ))}
        </div>
        <CopyButton label="Copy" text={current.code} fieldLabel={`${current.label} example`} />
      </div>
      <pre
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${active}`}
        className="overflow-x-auto p-3 font-mono text-xs leading-5"
      >
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
