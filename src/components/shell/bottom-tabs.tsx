'use client';

import { House, Menu, Package, Plus, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActivePath } from './nav-config';

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Home', href: '/home', icon: House },
  { label: 'Shipments', href: '/orders', icon: Package },
  { label: 'Wallet', href: '/finances/wallet', icon: Wallet },
];

const TAB =
  'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150';

/**
 * Phone and tablet navigation (below 64rem): Home, Shipments, a raised Create button, Wallet and More
 * (which opens the full menu). Hidden from the accessibility tree while the full menu is open.
 */
export function BottomTabs({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) {
  const pathname = usePathname();
  const [home, shipments, wallet] = TABS.map((tab) => ({
    ...tab,
    active: isActivePath(tab.href, pathname),
  }));

  const tab = (item: (typeof TABS)[number] & { active: boolean }) => {
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        className={`${TAB} ${item.active ? 'text-primary' : 'text-on-surface/60 hover:text-on-surface'}`}
      >
        <span
          className={`grid h-7 w-12 place-items-center rounded-full transition-colors duration-250 ${
            item.active ? 'bg-muted' : ''
          }`}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Quick links"
      aria-hidden={menuOpen || undefined}
      inert={menuOpen}
      data-testid="bottom-tabs"
      className="fixed inset-x-0 bottom-0 z-20 border-t print:hidden border-secondary bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-xl items-center px-2">
        {tab(home!)}
        {tab(shipments!)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/orders/create"
            aria-label="Create shipment"
            className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 transition-transform duration-150 active:scale-95"
          >
            <Plus aria-hidden="true" className="size-6" />
          </Link>
        </div>
        {tab(wallet!)}
        <button
          type="button"
          onClick={onOpenMenu}
          className={`${TAB} text-on-surface/60 hover:text-on-surface`}
        >
          <span className="grid h-7 w-12 place-items-center rounded-full">
            <Menu aria-hidden="true" className="size-5" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
