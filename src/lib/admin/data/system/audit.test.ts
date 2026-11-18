import { afterEach, describe, expect, it, vi } from 'vitest';
import { indianDay } from '../../../format/date';
import { DEFAULT_AUDIT_FILTERS, type AuditFilters } from './audit-filters';
import { cleanAuditEntry } from './audit';
import { gatewayAdminSystemService } from './gateway';
import { adminSystemService, recordAudit } from './index';
import { createMockAdminSystemService } from './mock';

const list = async (
  service = createMockAdminSystemService(),
  filters: Partial<AuditFilters> = {},
) => {
  const result = await service.listAuditLog({ ...DEFAULT_AUDIT_FILTERS, ...filters });
  if (!result.ok) throw new Error('The sample audit log should not fail');
  return result.data;
};

afterEach(() => {
  delete process.env.DATA_SOURCE_ADMIN_SYSTEM;
  vi.restoreAllMocks();
});

describe('sample audit log', () => {
  it('is labelled sample data, newest first, in pages', async () => {
    const result = await createMockAdminSystemService().listAuditLog(DEFAULT_AUDIT_FILTERS);
    if (!result.ok) throw new Error('should not fail');

    expect(result.source).toBe('mock');
    const { items, total, pageSize } = result.data.page;
    expect(items).toHaveLength(pageSize);
    expect(total).toBeGreaterThan(pageSize);
    const times = items.map(({ at }) => Date.parse(at));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('only names merchants from the shared sample list', async () => {
    const { page } = await list(undefined, { page: 1 });

    for (const { target } of page.items) {
      expect(target).not.toMatch(/@/);
    }
  });

  it('lists each action once, in order, for the filter', async () => {
    const { actions } = await list();

    expect(actions).toEqual([...new Set(actions)].sort());
    expect(actions.length).toBeGreaterThan(2);
  });
});

describe('recording', () => {
  it('puts a new entry first, with its own id and time', async () => {
    const service = createMockAdminSystemService();
    const before = Date.now();

    await service.recordAudit({ action: 'Wallet debit', target: 'mer_001', detail: 'Test.' });
    const [first, second] = (await list(service)).page.items;

    expect(first).toMatchObject({ action: 'Wallet debit', target: 'mer_001', detail: 'Test.' });
    expect(Date.parse(first?.at ?? '')).toBeGreaterThanOrEqual(before);
    expect(first?.id).not.toBe(second?.id);
  });

  it('keeps the order when two entries land together', async () => {
    const service = createMockAdminSystemService();

    await service.recordAudit({ action: 'A', target: 't', detail: 'first' });
    await service.recordAudit({ action: 'B', target: 't', detail: 'second' });

    expect((await list(service)).page.items.slice(0, 2).map(({ detail }) => detail)).toEqual([
      'second',
      'first',
    ]);
  });

  it('keeps each service separate, so tests do not leak into each other', async () => {
    await createMockAdminSystemService().recordAudit({ action: 'Only here', target: 't', detail: 'd' });

    expect((await list()).actions).not.toContain('Only here');
  });
});

describe('cleanAuditEntry', () => {
  it('trims and joins lines', () => {
    expect(cleanAuditEntry({ action: '  Wallet  credit ', target: 'mer_001\n', detail: 'a\n\nb' })).toEqual({
      action: 'Wallet credit',
      target: 'mer_001',
      detail: 'a b',
    });
  });

  it('caps long text', () => {
    const entry = cleanAuditEntry({ action: 'a'.repeat(200), target: 't'.repeat(300), detail: 'd'.repeat(900) });

    expect(entry.action).toHaveLength(80);
    expect(entry.target).toHaveLength(120);
    expect(entry.detail).toHaveLength(500);
    expect(entry.detail.endsWith('…')).toBe(true);
  });

  it('never leaves the action or target blank', () => {
    expect(cleanAuditEntry({ action: ' ', target: '', detail: '' })).toEqual({
      action: 'Unnamed action',
      target: 'Not given',
      detail: '',
    });
  });
});

describe('filtering', () => {
  it('filters by action', async () => {
    const service = createMockAdminSystemService();
    const action = (await list(service)).actions[0] ?? '';

    const { page, applied } = await list(service, { action });

    expect(applied.action).toBe(action);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((entry) => entry.action === action)).toBe(true);
  });

  it('ignores an action that is not in the log', async () => {
    const { page, applied } = await list(undefined, { action: 'Not a real action' });

    expect(applied.action).toBe('');
    expect(page.total).toBeGreaterThan(0);
  });

  it('filters by Indian calendar day, including both ends', async () => {
    const service = createMockAdminSystemService();
    await service.recordAudit({ action: 'Today', target: 't', detail: 'd' });
    const today = indianDay(new Date());

    const { page } = await list(service, { from: today, to: today });

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every(({ at }) => indianDay(at) === today)).toBe(true);
  });

  it('returns later pages and clamps a page past the end', async () => {
    const service = createMockAdminSystemService();
    const first = (await list(service)).page;

    const second = (await list(service, { page: 2 })).page;
    const tooFar = (await list(service, { page: 999 })).page;

    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
    expect(tooFar.page).toBe(Math.ceil(first.total / first.pageSize));
  });
});

describe('recordAudit helper', () => {
  it('records into the log the page reads', async () => {
    await recordAudit({ action: 'Helper check', target: 'mer_002', detail: 'From a test.' });

    const result = await adminSystemService().listAuditLog(DEFAULT_AUDIT_FILTERS);
    expect(result.ok && result.data.page.items[0]).toMatchObject({ action: 'Helper check' });
  });

  it('never throws, so a failed audit cannot undo the action that called it', async () => {
    process.env.DATA_SOURCE_ADMIN_SYSTEM = 'gateway';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      recordAudit({ action: 'Wallet credit', target: 'mer_001', detail: 'x' }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('gateway', () => {
  it('has no audit store yet, so it never passes sample data off as real', async () => {
    expect(await gatewayAdminSystemService.listAuditLog(DEFAULT_AUDIT_FILTERS)).toMatchObject({
      ok: false,
      source: 'gateway',
    });
    expect(
      await gatewayAdminSystemService.recordAudit({ action: 'a', target: 'b', detail: 'c' }),
    ).toMatchObject({ ok: false, source: 'gateway' });
  });
});
