'use client';

import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { buildCommands, filterCommands, type Command } from './command-items';
import { NAV } from './nav-config';

const COMMANDS = buildCommands(NAV);

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => filterCommands(COMMANDS, query), [query]);
  const current = Math.min(active, Math.max(0, results.length - 1));

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    router.push(command.href);
  };

  const groups = results.reduce<Record<string, { command: Command; index: number }[]>>((acc, command, index) => {
    (acc[command.group] ??= []).push({ command, index });
    return acc;
  }, {});

  return (
    <Dialog title="Search Evoc Ships" onClose={onClose}>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface/50" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results[current] ? `${listId}-${current}` : undefined}
          aria-label="Search screens, actions or AWBs"
          placeholder="Search screens, actions or paste an AWB"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((current + 1) % Math.max(1, results.length));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((current - 1 + results.length) % Math.max(1, results.length));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              run(results[current]);
            }
          }}
          className="h-12 w-full rounded-control border border-secondary bg-tertiary pr-3 pl-9 text-base outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div id={listId} role="listbox" aria-label="Results" className="mt-3 max-h-[min(60dvh,420px)] overflow-y-auto">
        {results.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-on-surface/60">No matches. Try a screen name or an AWB.</p>
        ) : (
          Object.entries(groups).map(([group, items]) => (
            <div key={group} role="group" aria-label={group} className="mb-2">
              <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-on-surface/40 uppercase">
                {group}
              </p>
              {items.map(({ command, index }) => (
                <div
                  key={command.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === current}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(command)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control px-3 text-sm transition-colors duration-150 lg:min-h-10 ${
                    index === current ? 'bg-muted text-primary' : 'text-on-surface'
                  }`}
                >
                  <span className="min-w-0 truncate">{command.label}</span>
                  {index === current ? <CornerDownLeft aria-hidden="true" className="size-4 shrink-0" /> : null}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}

/** ⌘K / Ctrl+K command search, opened from the keyboard or its top-bar buttons. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Command menu"
        aria-keyshortcuts="Meta+K Control+K"
        className="hidden h-control shrink-0 items-center gap-2 rounded-control border border-secondary bg-surface px-3 text-sm text-on-surface/60 transition-colors duration-150 hover:border-primary hover:text-primary lg:flex"
      >
        <Search aria-hidden="true" className="size-4" />
        <kbd className="rounded-md border border-secondary bg-tertiary px-1.5 font-mono text-[11px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command menu"
        className="grid size-11 shrink-0 place-items-center rounded-control text-on-surface/70 hover:text-primary lg:hidden"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
      {open ? <Palette onClose={() => setOpen(false)} /> : null}
    </>
  );
}
