import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { NavStatus } from '@/components/shell/nav-config';

export interface SettingsSection {
  label: string;
  description: string;
  href: string;
  status: NavStatus;
}

/** In the order of the plan's Decisions table. Each later task flips its section to `live`. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    label: 'Profile',
    description: 'Your name, phone number and password.',
    href: '/settings/profile',
    status: 'live',
  },
  {
    label: 'Company & KYC',
    description: 'Your business details and verification documents.',
    href: '/settings/company',
    status: 'live',
  },
  {
    label: 'Users & Roles',
    description: 'Invite teammates and choose what each can do.',
    href: '/settings/users',
    status: 'live',
  },
  {
    label: 'Pickup Addresses',
    description: 'The places couriers collect your parcels from.',
    href: '/settings/pickup-addresses',
    status: 'live',
  },
  {
    label: 'API Keys & Channel Integrations',
    description: 'Connect your store and send shipment updates to your own systems.',
    href: '/channel-integrations',
    status: 'live',
  },
  {
    label: 'Buyer Notifications',
    description: 'Choose which messages your buyers get about their parcels.',
    href: '/settings/notifications',
    status: 'live',
  },
  {
    label: 'Tracking Page',
    description: 'Set up the page your buyers open to follow a parcel.',
    href: '/settings/tracking-page',
    status: 'live',
  },
  {
    label: 'Courier Rules',
    description: 'Decide which couriers are used for which shipments.',
    href: '/settings/courier-rules',
    status: 'live',
  },
  {
    label: 'Sub-merchants',
    description: 'Manage the sellers who ship under your account.',
    href: '/settings/sub-merchants',
    status: 'planned',
  },
];

export const unavailable = (label: string) => `${label} is not available yet`;

const ROW = 'flex min-h-11 w-full items-center rounded-control px-3 py-2 text-left text-sm';

/**
 * The section list shared by every Settings page: a column on desktop, and a "Back to Settings"
 * link on phones, where the hub itself is the list.
 */
export function SettingsNav({ current }: { current: string }) {
  return (
    <>
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary lg:hidden"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Settings
      </Link>

      <nav aria-label="Settings sections" className="hidden lg:block">
        <ul className="flex flex-col gap-1">
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section.href}>
              {section.status === 'live' ? (
                <Link
                  href={section.href}
                  aria-current={section.href === current ? 'page' : undefined}
                  className={`${ROW} ${
                    section.href === current ? 'bg-muted font-medium text-primary' : 'hover:bg-muted'
                  }`}
                >
                  <span className="min-w-0 break-words">{section.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title={unavailable(section.label)}
                  className={`${ROW} cursor-not-allowed text-on-surface/50`}
                >
                  <span className="min-w-0 break-words">{section.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
