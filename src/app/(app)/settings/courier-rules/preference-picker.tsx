'use client';

import { PREFERENCES, PREFERENCE_DESCRIPTIONS, PREFERENCE_LABELS, type AllocationPreference } from '@/lib/data/courier-rules/types';

export function PreferencePicker({
  value,
  onChange,
}: {
  value: AllocationPreference;
  onChange: (next: AllocationPreference) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">How should we choose a courier?</legend>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {PREFERENCES.map((preference) => (
          <label
            key={preference}
            className="relative flex min-h-11 min-w-0 cursor-pointer flex-col gap-1 rounded-control border border-secondary p-3 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
          >
            <input
              type="radio"
              name="preference"
              value={preference}
              checked={value === preference}
              onChange={() => onChange(preference)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <span className="text-sm font-medium">{PREFERENCE_LABELS[preference]}</span>
            <span className="text-sm text-on-surface/70">{PREFERENCE_DESCRIPTIONS[preference]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
