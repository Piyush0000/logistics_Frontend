import {
  Building2,
  Cog,
  Headset,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Tags,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * The admin panel's sections, in menu order. `owner` is the teammate who builds the section
 * (see docs/admin/team-split.md); it is for the team only and never shown on screen.
 */
export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  owner: 1 | 2;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, description: 'Platform totals and what needs you today.', owner: 1 },
  { label: 'Merchants', href: '/admin/merchants', icon: Building2, description: 'Every seller, their shipments, wallet and status.', owner: 1 },
  { label: 'Onboarding & KYC', href: '/admin/onboarding', icon: ShieldCheck, description: 'Review new sign-ups and approve or reject KYC.', owner: 1 },
  { label: 'Shipments', href: '/admin/shipments', icon: Package, description: 'Shipments from every merchant, stuck ones first.', owner: 1 },
  { label: 'Money', href: '/admin/money', icon: Wallet, description: 'Merchant wallets, adjustments and COD remittances.', owner: 2 },
  { label: 'Pricing & couriers', href: '/admin/pricing', icon: Tags, description: 'Rate cards, zones and which couriers are on.', owner: 2 },
  { label: 'Support', href: '/admin/support', icon: Headset, description: 'Tickets from every merchant.', owner: 1 },
  { label: 'System', href: '/admin/system', icon: Cog, description: 'Service health, webhook failures and the audit log.', owner: 2 },
];

/** The nav item a path belongs to: Overview only for `/admin` itself, others for their whole subtree. */
export function activeAdminItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV.find((item) =>
    item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
