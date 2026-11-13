import type { NavGroup } from './nav-config';

export interface Command {
  id: string;
  label: string;
  group: 'Go to' | 'Actions' | 'Track';
  href: string;
  keywords?: string[];
}

const ACTIONS: Command[] = [
  { id: 'act-create', label: 'Create shipment', group: 'Actions', href: '/orders/create', keywords: ['book', 'new', 'order'] },
  { id: 'act-bulk', label: 'Bulk upload', group: 'Actions', href: '/orders/bulk', keywords: ['csv', 'import'] },
  { id: 'act-recharge', label: 'Recharge wallet', group: 'Actions', href: '/finances/wallet', keywords: ['money', 'balance', 'top up'] },
  { id: 'act-ticket', label: 'New ticket', group: 'Actions', href: '/support/tickets?new=1', keywords: ['help', 'support', 'issue'] },
  { id: 'act-track', label: 'Track a shipment', group: 'Actions', href: '/tools/tracking', keywords: ['awb', 'status', 'where'] },
];

/** Every live screen in the menu, then the quick actions. */
export function buildCommands(nav: NavGroup[]): Command[] {
  const screens: Command[] = [];
  for (const group of nav) {
    if (group.href && group.status === 'live') {
      screens.push({ id: `go-${group.href}`, label: group.label, group: 'Go to', href: group.href });
    }
    for (const item of group.children ?? []) {
      if (item.status !== 'live') continue;
      screens.push({
        id: `go-${item.href}`,
        label: item.label,
        group: 'Go to',
        href: item.href,
        keywords: [group.label],
      });
    }
  }
  return [...screens, ...ACTIONS];
}

/** One or more AWB-shaped tokens: letters and digits (6 to 40), each with at least one digit. */
export function looksLikeAwbs(query: string): boolean {
  const tokens = query.split(/[\s,]+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => /^[A-Za-z0-9-]{6,40}$/.test(t) && /\d/.test(t));
}

/** Case-insensitive match on label and keywords; an AWB-looking query also offers "Track …" first. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  const words = q.split(/\s+/);
  const matches = commands.filter((c) => {
    const haystack = [c.label, ...(c.keywords ?? [])].join(' ').toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
  if (!looksLikeAwbs(query)) return matches;
  const awbs = query.trim();
  return [
    { id: 'track-query', label: `Track ${awbs}`, group: 'Track', href: `/tools/tracking?awb=${encodeURIComponent(awbs)}` },
    ...matches,
  ];
}
