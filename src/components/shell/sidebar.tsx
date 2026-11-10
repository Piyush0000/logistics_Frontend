'use client';

import { ChevronDown, ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState, type Ref } from 'react';
import { signOutAction } from '@/app/(auth)/login/actions';
import { BrandMark } from '@/components/brand-mark';
import { userLabel } from '@/lib/format/user';
import { activeGroupLabel, isActivePath, NAV, type NavGroup, type NavItem } from './nav-config';

const ROW = 'flex h-12 w-full shrink-0 items-center gap-3 rounded-control px-3 text-base';
const CHILD_ROW = 'flex h-11 w-full items-center gap-3 rounded-control px-3 text-left text-[15px]';
const ACTIVE = 'bg-surface font-medium text-primary';
const IDLE = 'font-medium text-tertiary/90 hover:bg-surface/10 hover:text-tertiary';
const PLANNED = 'cursor-not-allowed text-tertiary/70';

const unavailable = (label: string) => `${label} is not available yet`;

/** The group that holds the current page, so it can start expanded. */
function submenuFor(pathname: string): string | null {
  const label = activeGroupLabel(pathname);
  return NAV.some((group) => group.label === label && group.children) ? label : null;
}

function ChildLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { label, href, icon: Icon } = item;

  if (item.status === 'planned') {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        title={unavailable(label)}
        className={`${CHILD_ROW} ${PLANNED}`}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    );
  }

  const isActive = isActivePath(href, pathname);
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`${CHILD_ROW} ${isActive ? ACTIVE : IDLE}`}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

function SingleLink({
  group,
  pathname,
  railOpen,
}: {
  group: NavGroup & { href: string };
  pathname: string;
  railOpen: boolean;
}) {
  const { label: text, href, icon: Icon } = group;
  const label = railOpen ? '' : 'lg:hidden';
  const collapsedRow = railOpen ? '' : 'lg:justify-center lg:px-0';

  if (group.status !== 'live') {
    return (
      <button
        type="button"
        disabled
        aria-label={text}
        title={unavailable(text)}
        className={`${ROW} ${collapsedRow} ${PLANNED} text-left`}
      >
        <Icon aria-hidden="true" className="size-6 shrink-0" />
        <span className={`min-w-0 flex-1 truncate ${label}`}>{text}</span>
      </button>
    );
  }

  const isActive =
    isActivePath(href, pathname) ||
    (group.alsoActiveFor ?? []).some((prefix) => isActivePath(prefix, pathname));
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={text}
      title={railOpen ? undefined : text}
      className={`${ROW} ${collapsedRow} ${isActive ? ACTIVE : IDLE}`}
    >
      <Icon aria-hidden="true" className="size-6 shrink-0" />
      <span className={`min-w-0 flex-1 truncate ${label}`}>{text}</span>
    </Link>
  );
}

function Submenu({
  group,
  pathname,
  railOpen,
  expanded,
  onSelect,
}: {
  group: NavGroup & { children: NavItem[] };
  pathname: string;
  railOpen: boolean;
  expanded: boolean;
  onSelect: () => void;
}) {
  const listId = useId();
  const { label: text, icon: Icon, children } = group;
  const label = railOpen ? '' : 'lg:hidden';
  const collapsedRow = railOpen ? '' : 'lg:justify-center lg:px-0';
  // The list only shows inside the open menu: the collapsed rail has no room for it.
  const shown = expanded && railOpen;
  const holdsPage = activeGroupLabel(pathname) === text;

  return (
    <div>
      <button
        type="button"
        onClick={onSelect}
        aria-label={text}
        aria-expanded={shown}
        aria-controls={listId}
        title={railOpen ? undefined : text}
        className={`${ROW} ${collapsedRow} text-left ${
          holdsPage && !shown ? ACTIVE : IDLE
        }`}
      >
        <Icon aria-hidden="true" className="size-6 shrink-0" />
        <span className={`min-w-0 flex-1 truncate ${label}`}>{text}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${shown ? 'rotate-180' : ''} ${label}`}
        />
      </button>
      <ul
        id={listId}
        hidden={!shown}
        className="mt-1 mb-1 ml-6 flex flex-col gap-1 border-l border-tertiary/30 pl-3"
      >
        {children.map((item) => (
          <li key={item.href}>
            <ChildLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({
  email,
  open,
  panelRef,
  closeButtonRef,
  onToggle,
  onClose,
}: {
  email: string;
  open: boolean;
  panelRef: Ref<HTMLElement>;
  closeButtonRef: Ref<HTMLButtonElement>;
  onToggle: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { name, initials } = userLabel(email);
  // Labels show in the phone menu and the expanded rail, and hide in the collapsed rail.
  const label = open ? '' : 'lg:hidden';
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => {
    const current = submenuFor(pathname);
    return new Set(current ? [current] : []);
  });
  const [seenPath, setSeenPath] = useState(pathname);

  // Opening another page also opens the group that holds it.
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    const current = submenuFor(pathname);
    if (current && !expanded.has(current)) setExpanded(new Set([...expanded, current]));
  }

  const selectGroup = (group: string) => {
    if (!open) {
      // A collapsed rail icon opens the menu with that group showing.
      onToggle();
      setExpanded(new Set([...expanded, group]));
      return;
    }
    const next = new Set(expanded);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpanded(next);
  };

  return (
    <aside
      ref={panelRef}
      data-testid="sidebar"
      // Visibility only animates on close, so focus can move into the menu as soon as it opens.
      className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,320px)] flex-col bg-primary text-tertiary duration-200 lg:visible lg:translate-x-0 ${
        open
          ? 'transition-[transform,width] lg:w-80'
          : 'transition-[transform,visibility,width] max-lg:invisible max-lg:-translate-x-full lg:w-20'
      }`}
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between px-4">
        <div className={open ? '' : 'lg:hidden'}>
          <BrandMark />
        </div>
        <div className={open ? 'hidden' : 'hidden lg:block'}>
          <BrandMark compact />
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-11 place-items-center rounded-control lg:hidden"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={open}
        className="absolute top-5 -right-4 hidden size-8 place-items-center rounded-full border-2 border-tertiary bg-primary lg:grid"
      >
        {open ? (
          <ChevronLeft aria-hidden="true" className="size-4" />
        ) : (
          <ChevronRight aria-hidden="true" className="size-4" />
        )}
      </button>

      <nav
        aria-label="Main"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-2 [scrollbar-width:none]"
      >
        {NAV.map((group) => (
          <div key={group.label} className="contents">
            {group.dividerBefore ? (
              <hr aria-hidden="true" className="my-1 shrink-0 border-tertiary/20" />
            ) : null}
            {group.children ? (
              <Submenu
                group={{ ...group, children: group.children }}
                pathname={pathname}
                railOpen={open}
                expanded={expanded.has(group.label)}
                onSelect={() => selectGroup(group.label)}
              />
            ) : group.href ? (
              <SingleLink group={{ ...group, href: group.href }} pathname={pathname} railOpen={open} />
            ) : null}
          </div>
        ))}
      </nav>

      <div
        data-testid="sidebar-user"
        className={`flex shrink-0 items-center gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] ${
          open ? '' : 'lg:justify-center lg:px-0'
        }`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-tertiary/60 text-sm font-medium">
          {initials}
        </span>
        <span className={`min-w-0 flex-1 ${label}`}>
          <span className="block truncate text-sm font-medium">{name}</span>
          <span title="Profile is not available yet" className="block text-xs text-tertiary/80">
            View Profile
          </span>
        </span>
        <form action={signOutAction} className={label}>
          <button
            type="submit"
            aria-label="Sign out"
            className="grid size-11 place-items-center rounded-control"
          >
            <LogOut aria-hidden="true" className="size-5" />
          </button>
        </form>
      </div>
    </aside>
  );
}
