'use client';

import { ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useDismiss } from '@/components/shell/use-dismiss';
import { FIELD_LABEL, FIELD_POPUP, FIELD_TRIGGER } from './field-styles';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function SelectField<T extends string>({
  label,
  name,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  name: string;
  value: T;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useDismiss(root, open, close);

  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function toggle() {
    setActive(Math.max(selectedIndex, 0));
    setOpen((current) => !current);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  }

  function handleKey(event: KeyboardEvent) {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };

    const next = moves[event.key];

    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Tab') {
      close();
    }
  }

  return (
    <div ref={root} className="relative min-w-0">
      <span id={`${id}-label`} className={FIELD_LABEL}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={toggle}
        className={FIELD_TRIGGER}
      >
        <span id={`${id}-value`} className="min-w-0 truncate">
          {options[selectedIndex]?.label}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </button>
      {open ? (
        <ul
          ref={list}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={handleKey}
          className={`${FIELD_POPUP} max-h-72 w-full overflow-y-auto p-1`}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => choose(index)}
              onPointerMove={() => setActive(index)}
              className={`flex min-h-11 cursor-pointer items-center rounded-control px-3 text-sm lg:min-h-9 ${
                index === active ? 'bg-muted' : ''
              } ${option.value === value ? 'font-medium text-primary' : ''}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
