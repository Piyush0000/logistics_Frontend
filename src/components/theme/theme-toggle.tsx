'use client';

import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import {
  applyThemePreference,
  readThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from '@/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Keeps "System" following the OS setting after the pre-paint script ran. Render once, in the root layout. */
export function ThemeWatcher() {
  useEffect(() => {
    applyThemePreference(readThemePreference());
  }, []);
  return null;
}

function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    (): ThemePreference => 'system',
  );
  return [preference, applyThemePreference] as const;
}

/**
 * The theme switch. `menu` is a three-way choice for the user menu; `icon` is one button that cycles
 * light → dark → system, for screens without a user menu (sign-in pages).
 */
export function ThemeToggle({ variant }: { variant: 'menu' | 'icon' }) {
  const [preference, choose] = useThemePreference();

  if (variant === 'icon') {
    const index = OPTIONS.findIndex((option) => option.value === preference);
    const current = OPTIONS[index]!;
    const next = OPTIONS[(index + 1) % OPTIONS.length]!;
    const Icon = current.icon;
    return (
      <button
        type="button"
        onClick={() => choose(next.value)}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        className="grid size-11 place-items-center rounded-full border border-secondary bg-surface text-on-surface/80 transition-colors duration-150 hover:text-primary lg:size-9"
      >
        <Icon aria-hidden="true" className="size-4" />
      </button>
    );
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-control bg-tertiary p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(value)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[8px] text-xs font-medium transition-colors duration-150 lg:min-h-8 ${
              selected ? 'bg-surface text-primary shadow-sm' : 'text-on-surface/70 hover:text-on-surface'
            }`}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
