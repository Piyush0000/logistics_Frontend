'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { carrierLabel } from '@/components/orders/carrier-badge';
import type { CourierRules } from '@/lib/data/courier-rules';

type Carrier = CourierRules['priority'][number];

const MOVE_BUTTON =
  'inline-flex size-control items-center justify-center rounded-control border border-secondary hover:bg-muted aria-disabled:cursor-not-allowed aria-disabled:text-on-surface/30 aria-disabled:hover:bg-transparent';

/**
 * Couriers in the order they are tried, first choice at the top. Move up and Move down are plain
 * buttons, so they work by keyboard and by tap, and each switch turns one courier on or off. At the
 * top or bottom the button is marked aria-disabled, not disabled, so keyboard focus is not lost
 * when a courier reaches the end.
 */
export function PriorityList({
  rules,
  onMove,
  onToggle,
}: {
  rules: CourierRules;
  onMove: (carrier: Carrier, direction: 'up' | 'down') => void;
  onToggle: (carrier: Carrier, enabled: boolean) => void;
}) {
  const on = rules.priority.filter((carrier) => !rules.disabled.includes(carrier));

  return (
    <div className="min-w-0">
      <h3 className="text-sm font-medium">Courier order</h3>
      <p className="mt-1 text-sm text-on-surface/70">
        {rules.preference === 'custom'
          ? 'Couriers are tried from the top. Switched-off couriers are skipped.'
          : 'This order is used when you choose Custom. Switched-off couriers are never used.'}
      </p>
      <ol className="mt-3 divide-y divide-secondary rounded-control border border-secondary">
        {rules.priority.map((carrier, index) => {
          const name = carrierLabel(carrier);
          const enabled = !rules.disabled.includes(carrier);
          const lastOn = enabled && on.length === 1;
          return (
            <li
              key={carrier}
              data-testid="courier-row"
              data-name={name}
              className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3"
            >
              <p className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="w-5 shrink-0 text-sm text-on-surface/60">
                  {index + 1}
                </span>
                <span className={`min-w-0 text-sm font-medium break-words ${enabled ? '' : 'text-on-surface/50'}`}>
                  {name}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <label
                  title={lastOn ? 'At least one courier must stay on.' : undefined}
                  className={`relative flex min-h-11 items-center gap-2 rounded-control px-2 py-1 text-sm ${lastOn ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}`}
                >
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`Use ${name}`}
                    checked={enabled}
                    disabled={lastOn}
                    onChange={(event) => onToggle(carrier, event.target.checked)}
                    className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-9 shrink-0 items-center rounded-full bg-on-surface/50 p-0.5 peer-checked:justify-end peer-checked:bg-primary peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                  >
                    <span className="size-4 rounded-full bg-surface" />
                  </span>
                  <span className="w-7">{enabled ? 'On' : 'Off'}</span>
                </label>
                <button
                  type="button"
                  aria-label={`Move ${name} up`}
                  aria-disabled={index === 0}
                  onClick={() => index > 0 && onMove(carrier, 'up')}
                  className={MOVE_BUTTON}
                >
                  <ChevronUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${name} down`}
                  aria-disabled={index === rules.priority.length - 1}
                  onClick={() => index < rules.priority.length - 1 && onMove(carrier, 'down')}
                  className={MOVE_BUTTON}
                >
                  <ChevronDown aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {on.length === 1 ? (
        <p className="mt-2 text-sm text-on-surface/70">
          Only one courier is on. At least one must stay on, so its switch is locked.
        </p>
      ) : null}
    </div>
  );
}
