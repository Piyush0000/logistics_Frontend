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
}

export const NAV: NavGroup[] = [
  { label: 'Home', icon: House, href: '/home', status: 'live' },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', status: 'live' },
  {
    label: 'Shipping Management',
    icon: ShoppingCart,
    dividerBefore: true,
    children: [
      { label: 'All Shipments', href: '/orders', status: 'live', icon: Package },
      { label: 'B2C Shipments', href: '/orders/b2c', status: 'planned', icon: UserRound },
      { label: 'B2B Shipments', href: '/orders/b2b', status: 'planned', icon: Building2 },
      { label: 'Create Shipment', href: '/orders/create', status: 'live', icon: PackagePlus },
      { label: 'Bulk Upload', href: '/orders/bulk', status: 'planned', icon: Upload },
      { label: 'Pickups & Manifests', href: '/orders/pickups', status: 'planned', icon: Truck },
    ],
  },
  {
    label: 'Operations',
    icon: ArrowLeftRight,
    children: [
      { label: 'NDR', href: '/ndr', status: 'live', icon: TriangleAlert },
      { label: 'RTO', href: '/rto', status: 'planned', icon: Undo2 },
    ],
  },
  {
    label: 'Billings',
    icon: Banknote,
    dividerBefore: true,
    children: [
      { label: 'Wallet Transactions', href: '/finances/wallet', status: 'live', icon: Wallet },
      { label: 'COD Remittance', href: '/finances/cod', status: 'live', icon: HandCoins },
      { label: 'Invoice', href: '/finances/invoices', status: 'planned', icon: ReceiptText },
    ],
  },
  {
    label: 'Reconciliation',
    icon: Scale,
    children: [
      { label: 'Weight', href: '/reconciliation/weight', status: 'planned', icon: Weight },
      {
        label: 'Weight Settings',
        href: '/reconciliation/weight-settings',
        status: 'planned',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: 'Tools',
    icon: BriefcaseBusiness,
    dividerBefore: true,
    children: [
      { label: 'Rate Card', href: '/tools/rate-card', status: 'planned', icon: FileSpreadsheet },
      {
        label: 'Rate Calculator',
        href: '/tools/rate-calculator',
        status: 'planned',
        icon: Calculator,
      },
      { label: 'Order Tracking', href: '/tools/tracking', status: 'planned', icon: MapPinned },
    ],
  },
  { label: 'Reports', icon: FileChartColumn, href: '/reports', status: 'planned' },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    status: 'planned',
    alsoActiveFor: ['/channel-integrations', '/settings'],
  },
  {
    label: 'Help & Support',
    icon: CircleHelp,
    children: [
      { label: 'Support Tickets', href: '/support/tickets', status: 'planned', icon: Ticket },
      { label: 'Help Centre', href: '/support/help', status: 'planned', icon: BookOpen },
    ],
  },
];

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

/** The label of the group that owns `pathname`, whether or not its screen is live yet. */
export function activeGroupLabel(pathname: string): string | null {
  const group = NAV.find(
    (entry) =>
      (entry.href !== undefined && isActivePath(entry.href, pathname)) ||
      (entry.children ?? []).some((item) => isActivePath(item.href, pathname)) ||
      (entry.alsoActiveFor ?? []).some((prefix) => isWithin(prefix, pathname)),
  );
  return group?.label ?? null;
}
