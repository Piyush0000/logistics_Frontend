import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { OnboardingItem } from '@/lib/data/onboarding';

/** The setup steps with a count, each a link to the screen that completes it. */
export function OnboardingChecklist({ items }: { items: OnboardingItem[] }) {
  const done = items.filter((item) => item.done).length;

  return (
    <div>
      <p className="text-sm font-medium">
        {done} of {items.length} done
      </p>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
        />
      </div>
      <ul className="mt-3 grid">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              prefetch={false}
              data-done={item.done}
              className="flex min-h-11 items-center gap-3 rounded-control px-1 py-2 text-sm hover:bg-tertiary"
            >
              <span
                aria-hidden="true"
                className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                  item.done
                    ? 'border-success bg-success/15 text-success'
                    : 'border-secondary text-transparent'
                }`}
              >
                <Check className="size-4" />
              </span>
              <span
                className={`min-w-0 flex-1 break-words ${item.done ? 'text-on-surface/70' : ''}`}
              >
                {item.label}
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-on-surface/40" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
