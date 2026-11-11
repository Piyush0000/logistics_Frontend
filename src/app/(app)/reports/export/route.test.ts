import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: { email: 'ops@example.com' } as { email: string } | null }));
const wallet = vi.hoisted(() => ({ listTransactions: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/wallet', () => ({ walletService: () => wallet }));

import { GET } from './route';

const entry = (index: number) => ({
  id: `w-${index}`,
  direction: 'credit' as const,
  debitType: null,
  title: `Recharge ${index}`,
  orderRef: null,
  amountPaise: 10000,
  breakdown: null,
  occurredAt: '2026-10-15T06:00:00.000Z',
});

const request = () =>
  new NextRequest('http://localhost/reports/export?type=wallet&from=2026-10-01&to=2026-10-31');

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  wallet.listTransactions.mockReset();
});

describe('GET /reports/export?type=wallet', () => {
  it('ends with the truncation line when more pages exist than are read', async () => {
    wallet.listTransactions.mockImplementation(async ({ page }: { page: number }) => ({
      ok: true,
      source: 'gateway',
      data: {
        entries: Array.from({ length: 10 }, (_, index) => entry(page * 10 + index)),
        page,
        pageCount: 500,
        total: 5000,
      },
    }));

    const csv = await (await GET(request())).text();

    expect(csv.trimEnd().split('\r\n').at(-1)).toBe(
      '# Truncated: first 1000 rows. Narrow the date range to see the rest.',
    );
  });

  it('has no truncation line when every page was read', async () => {
    wallet.listTransactions.mockResolvedValue({
      ok: true,
      source: 'gateway',
      data: { entries: [entry(1)], page: 1, pageCount: 1, total: 1 },
    });

    const csv = await (await GET(request())).text();

    expect(csv).not.toContain('# Truncated');
  });
});
