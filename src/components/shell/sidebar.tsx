'use client';

import {
  BriefcaseBusiness,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Headset,
  LogOut,
  Package,
  Undo2,
  UserCheck,
  WandSparkles,
  Webhook,
  Weight,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Ref } from 'react';
import { signOutAction } from '@/app/(auth)/login/actions';
import { BrandMark } from '@/components/brand-mark';
import { userLabel } from '@/lib/format/user';

interface NavItem {
  label: string;
  icon: LucideIcon;
  hasChildren?: boolean;
}

const ACTIVE_ITEMS: (NavItem & { href: string })[] = [
  { label: 'Overview', href: '/dashboard', icon: ChartColumn },
  { label: 'Orders', href: '/orders', icon: Package, hasChildren: true },
  { label: 'NDR', href: '/ndr', icon: Undo2 },
];

const DISABLED_ITEMS: NavItem[] = [
  { label: 'Weight Discrepancy', icon: Weight },
  { label: 'Finances', icon: CreditCard, hasChildren: true },
  { label: 'Buyer Experience', icon: WandSparkles, hasChildren: true },
  { label: 'Business Tools', icon: BriefcaseBusiness, hasChildren: true },
  { label: 'KYC Info', icon: UserCheck },
  { label: 'Get Support', icon: Headset },
  { label: 'Channel Integrations', icon: Webhook },
];

const ROW = 'flex h-12 w-full shrink-0 items-center gap-3 rounded-control px-3 text-base';

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
  const collapsedRow = open ? '' : 'lg:justify-center lg:px-0';

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
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-2 [scrollbar-width:none]"
      >
        {ACTIVE_ITEMS.map(({ label: text, href, icon: Icon, hasChildren }) => {
          const isActive =
            href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={text}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={text}
              className={`${ROW} ${collapsedRow} ${
                isActive
                  ? 'bg-surface font-medium text-primary'
                  : 'font-medium text-tertiary/90 hover:bg-surface/10 hover:text-tertiary'
              }`}
            >
              <Icon aria-hidden="true" className="size-6 shrink-0" />
              <span className={`min-w-0 flex-1 truncate ${label}`}>{text}</span>
              {hasChildren ? (
                <ChevronDown aria-hidden="true" className={`size-4 shrink-0 ${label}`} />
              ) : null}
            </Link>
          );
        })}
        {DISABLED_ITEMS.map(({ label: text, icon: Icon, hasChildren }) => (
          <button
            key={text}
            type="button"
            disabled
            aria-label={text}
            title={`${text} is not available yet`}
            className={`${ROW} ${collapsedRow} cursor-not-allowed text-left text-tertiary/80`}
          >
            <Icon aria-hidden="true" className="size-6 shrink-0" />
            <span className={`min-w-0 flex-1 truncate ${label}`}>{text}</span>
            {hasChildren ? (
              <ChevronDown aria-hidden="true" className={`size-4 shrink-0 ${label}`} />
            ) : null}
          </button>
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
