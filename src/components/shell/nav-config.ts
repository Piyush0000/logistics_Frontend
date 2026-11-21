import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CircleHelp,
  FileChartColumn,
  FileSpreadsheet,
  HandCoins,
  House,
  LayoutDashboard,
  MapPinned,
  Package,
  PackagePlus,
  ReceiptText,
  Scale,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Ticket,
  TriangleAlert,
  Truck,
  Undo2,
  Upload,
  UserRound,
  Wallet,
  Weight,
  type LucideIcon,
} from 'lucide-react';

/**
 * The sidebar menu. A new screen appears in the sidebar by adding an entry here as `planned`,
 * then flipping it to `live` once its page exists.
 */
export type NavStatus = 'live' | 'planned';

export interface NavItem {
  label: string;
  href: string;
  status: NavStatus;
  icon: LucideIcon;
  /** The screen works on sample data only: its backend is not built yet. Hidden in production. */
  soon?: boolean;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  href?: string; // single-link groups: Home, Dashboard, Reports, Settings
  status?: NavStatus; // single-link groups only
  children?: NavItem[];
  /** Extra path prefixes that mark this group active, e.g. Settings owns /channel-integrations. */
  alsoActiveFor?: string[];
  dividerBefore?: boolean;
  /** Small heading shown above this group in the open menu; starts a new section. */
  section?: string;
}

export const NAV: NavGroup[] = [
  { label: 'Home', icon: House, href: '/home', status: 'live', section: 'Overview' },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', status: 'live' },
  {
    label: 'Shipping Management',
    section: 'Shipping',
    icon: ShoppingCart,
    dividerBefore: true,
    children: [
      { label: 'All Shipments', href: '/orders', status: 'live', icon: Package },
      { label: 'B2C Shipments', href: '/orders/b2c', status: 'live', icon: UserRound },
      { label: 'B2B Shipments', href: '/orders/b2b', status: 'live', icon: Building2, soon: true },
      { label: 'Create Shipment', href: '/orders/create', status: 'live', icon: PackagePlus },
      { label: 'Bulk Upload', href: '/orders/bulk', status: 'live', icon: Upload },
      { label: 'Pickups & Manifests', href: '/orders/pickups', status: 'live', icon: Truck, soon: true },
    ],
  },
  {
    label: 'Operations',
    icon: ArrowLeftRight,
    children: [
      { label: 'NDR', href: '/ndr', status: 'live', icon: TriangleAlert, soon: true },
      { label: 'RTO', href: '/rto', status: 'live', icon: Undo2 },
    ],
  },
  {
    label: 'Billings',
    section: 'Money',
    icon: Banknote,
    dividerBefore: true,
    children: [
      { label: 'Wallet Transactions', href: '/finances/wallet', status: 'live', icon: Wallet },
      { label: 'COD Remittance', href: '/finances/cod', status: 'live', icon: HandCoins },
      { label: 'Invoice', href: '/finances/invoices', status: 'live', icon: ReceiptText, soon: true },
    ],
  },
  {
    label: 'Reconciliation',
    icon: Scale,
    children: [
      { label: 'Weight', href: '/reconciliation/weight', status: 'live', icon: Weight, soon: true },
      {
        label: 'Weight Settings',
        href: '/reconciliation/weight-settings',
        status: 'live',
        soon: true,
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: 'Tools',
    section: 'Tools & account',
    icon: BriefcaseBusiness,
    dividerBefore: true,
    children: [
      { label: 'Rate Card', href: '/tools/rate-card', status: 'live', icon: FileSpreadsheet, soon: true },
      {
        label: 'Rate Calculator',
        href: '/tools/rate-calculator',
        status: 'live',
        soon: true,
        icon: Calculator,
      },
      { label: 'Order Tracking', href: '/tools/tracking', status: 'live', icon: MapPinned },
    ],
  },
  { label: 'Reports', icon: FileChartColumn, href: '/reports', status: 'live' },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    status: 'live',
    alsoActiveFor: ['/channel-integrations'],
  },
  {
    label: 'Help & Support',
    icon: CircleHelp,
    children: [
      { label: 'Support Tickets', href: '/support/tickets', status: 'live', icon: Ticket, soon: true },
      { label: 'Help Centre', href: '/support/help', status: 'live', icon: BookOpen },
    ],
  },
];

/**
 * The menu as shown: with `liveOnly` (production, real data only) screens whose backend is not
 * built yet are left out, and so is a group left with no items.
 */
export function visibleNav(liveOnly: boolean, nav: NavGroup[] = NAV): NavGroup[] {
  if (!liveOnly) return nav;
  return nav.flatMap((group) => {
    if (!group.children) return [group];
    const children = group.children.filter((item) => !item.soon);
    return children.length ? [{ ...group, children }] : [];
  });
}

const ALL_HREFS = NAV.flatMap((group) => [
  ...(group.href ? [group.href] : []),
  ...(group.children ?? []).map((item) => item.href),
]);

const isWithin = (prefix: string, pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * True when `pathname` is `href` or a page below it, unless a deeper menu entry owns that page,
 * so `/orders` covers `/orders/<id>` but not `/orders/create`.
 */
export function isActivePath(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !ALL_HREFS.some(
    (other) => other !== href && other.startsWith(`${href}/`) && isWithin(other, pathname),
  );
}

/**
 * True when `pathname` belongs to this menu entry: its own page, a page below one of its items, or
 * one of its `alsoActiveFor` prefixes. The sidebar and `activeGroupLabel` both use this one rule.
 */
export function isGroupActive(group: NavGroup, pathname: string): boolean {
  return (
    (group.href !== undefined && isActivePath(group.href, pathname)) ||
    (group.children ?? []).some((item) => isActivePath(item.href, pathname)) ||
    (group.alsoActiveFor ?? []).some((prefix) => isWithin(prefix, pathname))
  );
}

/** The label of the group that owns `pathname`, whether or not its screen is live yet. */
export function activeGroupLabel(pathname: string): string | null {
  return NAV.find((entry) => isGroupActive(entry, pathname))?.label ?? null;
}
