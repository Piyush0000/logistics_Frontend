'use client';

import { useState, useTransition } from 'react';
import { moveCourier, type CourierRules } from '@/lib/data/courier-rules';
import { moveCourierAction, setCourierEnabledAction, setPreferenceAction, type RulesActionResult } from './actions';
import { PreferencePicker } from './preference-picker';
import { PriorityList } from './priority-list';

type Feedback = { ok: boolean; message: string } | null;

/** The preference, the courier order and the switches. Every change is saved on its own. */
export function RulesPanel({ initial }: { initial: CourierRules }) {
  const [rules, setRules] = useState(initial);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [, start] = useTransition();

  /**
   * Shows the change at once, then replaces it with what the server saved. If the server refuses,
   * the screen goes back to the rules it had before and says why.
   */
  function run(optimistic: CourierRules, action: () => Promise<RulesActionResult>) {
    const before = rules;
    setRules(optimistic);
    start(async () => {
      const result = await action();
      setRules(result.ok ? result.rules : before);
      setFeedback({ ok: result.ok, message: result.message });
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {feedback ? (
        <p
          role={feedback.ok ? 'status' : 'alert'}
          className={`rounded-control p-3 text-sm [overflow-wrap:anywhere] ${feedback.ok ? 'bg-success/15' : 'bg-error/10'}`}
        >
          {feedback.message}
        </p>
      ) : null}

      <PreferencePicker value={rules.preference} onChange={(next) => run({ ...rules, preference: next }, () => setPreferenceAction(next))} />

      <PriorityList
        rules={rules}
        onMove={(carrier, direction) =>
          run({ ...rules, priority: moveCourier(rules.priority, carrier, direction) }, () =>
            moveCourierAction(carrier, direction),
          )
        }
        onToggle={(carrier, enabled) =>
          run(
            {
              ...rules,
              disabled: enabled ? rules.disabled.filter((c) => c !== carrier) : [...rules.disabled, carrier],
            },
            () => setCourierEnabledAction(carrier, enabled),
          )
        }
      />
    </div>
  );
}
