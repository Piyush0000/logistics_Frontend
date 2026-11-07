'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { useDismiss } from '@/components/shell/use-dismiss';
import {
  addDays,
  addMonths,
  formatIsoDay,
  monthCells,
  monthLabel,
  monthOf,
  type CalendarMonth,
} from '@/lib/format/calendar';
import { indianDay } from '@/lib/format/date';
import { FIELD_LABEL, FIELD_POPUP, FIELD_TRIGGER } from './field-styles';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

const MONTH_BUTTON = 'grid size-control place-items-center rounded-control hover:bg-muted';

export function DateField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState('');
  const [focusDay, setFocusDay] = useState('');
  const [view, setView] = useState<CalendarMonth>({ year: 2026, month: 0 });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useDismiss(root, open, close);

  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [open, focusDay]);

  function toggle() {
    if (open) {
      close();
      return;
    }
    const now = indianDay(new Date());
    const start = value || now;
    setToday(now);
    setFocusDay(start);
    setView(monthOf(start));
    setOpen(true);
  }

  function choose(day: string) {
    onChange(day);
    close();
  }

  function handleKey(event: KeyboardEvent) {
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = addDays(focusDay, step);
    setFocusDay(next);
    setView(monthOf(next));
  }

  // Tabbing away closes the calendar. A press on its plain text has no related target.
  function handleBlur(event: FocusEvent) {
    if (event.relatedTarget && !root.current?.contains(event.relatedTarget)) setOpen(false);
  }

  const cells = monthCells(view);
  // After changing month, Tab still needs one day to land on.
  const tabDay = cells.includes(focusDay) ? focusDay : cells.find(Boolean);

  return (
    <div ref={root} className="relative min-w-0">
      <span id={`${id}-label`} className={FIELD_LABEL}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={toggle}
        className={FIELD_TRIGGER}
      >
        <span id={`${id}-value`} className={value ? '' : 'text-on-surface/70'}>
          {value ? formatIsoDay(value) : 'Select date'}
        </span>
        <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-primary" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          onBlur={handleBlur}
          className={`${FIELD_POPUP} w-full max-w-[22rem] p-2`}
        >
          <div className="flex items-center justify-between gap-2 pl-2">
            <p aria-live="polite" className="text-sm font-medium">
              {monthLabel(view)}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setView((current) => addMonths(current, -1))}
                className={MONTH_BUTTON}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setView((current) => addMonths(current, 1))}
                className={MONTH_BUTTON}
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>

          <div aria-hidden="true" className="mt-1 grid grid-cols-7 text-center text-xs leading-6">
            {WEEKDAYS.map((day, index) => (
              <span key={index} className="text-on-surface/70">
                {day}
              </span>
            ))}
          </div>

          <div ref={grid} onKeyDown={handleKey} className="grid grid-cols-7">
            {cells.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  data-day={day}
                  tabIndex={day === tabDay ? 0 : -1}
                  aria-label={formatIsoDay(day)}
                  aria-pressed={day === value}
                  aria-current={day === today ? 'date' : undefined}
                  onClick={() => choose(day)}
                  className={`h-control rounded-control border text-sm ${
                    day === value
                      ? 'border-primary bg-primary font-medium text-tertiary'
                      : `hover:bg-muted ${day === today ? 'border-primary' : 'border-transparent'}`
                  }`}
                >
                  {Number(day.slice(8))}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              ),
            )}
          </div>

          {value ? (
            <button
              type="button"
              onClick={() => choose('')}
              className="mt-1 h-control w-full rounded-control text-sm font-medium text-primary hover:bg-muted"
            >
              Remove date
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
