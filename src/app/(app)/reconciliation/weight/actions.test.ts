import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ accept: vi.fn(), dispute: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/weight', async (original) => ({
  ...(await original<typeof import('@/lib/data/weight')>()),
  weightService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { acceptDiscrepancyAction, disputeDiscrepancyAction } from './actions';

const image = { name: 'parcel.png', type: 'image/png', size: 1000 };
const input = { id: 'wd-001', note: 'The parcel was weighed at 0.5 kg.', evidence: [image] };

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.accept.mockReset();
  service.dispute.mockReset();
});

describe('signed out', () => {
  it('refuses both actions before touching the service', async () => {
    session.current = null;

    expect(await acceptDiscrepancyAction('wd-001')).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await disputeDiscrepancyAction(input)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.accept).not.toHaveBeenCalled();
    expect(service.dispute).not.toHaveBeenCalled();
  });
});

describe('acceptDiscrepancyAction', () => {
  it('refuses a missing id', async () => {
    expect(await acceptDiscrepancyAction(42)).toMatchObject({ ok: false });
    expect(service.accept).not.toHaveBeenCalled();
  });

  it('passes the id on and reports success', async () => {
    service.accept.mockResolvedValue({ ok: true, source: 'mock', data: { awb: 'A1' } });
    expect(await acceptDiscrepancyAction('wd-001')).toMatchObject({ ok: true });
    expect(service.accept).toHaveBeenCalledWith('wd-001');
  });

  it('returns the service message on failure', async () => {
    service.accept.mockResolvedValue({
      ok: false,
      source: 'mock',
      error: { kind: 'conflict', status: 409, message: 'Already answered.' },
    });
    expect(await acceptDiscrepancyAction('wd-001')).toEqual({ ok: false, message: 'Already answered.' });
  });
});

describe('disputeDiscrepancyAction', () => {
  it('checks the evidence on the server before calling the service', async () => {
    for (const bad of [
      { ...input, evidence: [] },
      { ...input, evidence: [{ ...image, size: 6 * 1024 * 1024 }] },
      { ...input, evidence: [{ ...image, type: 'image/gif' }] },
      { ...input, note: 'short' },
      { id: 5 },
      null,
    ]) {
      expect(await disputeDiscrepancyAction(bad)).toMatchObject({ ok: false });
    }
    expect(service.dispute).not.toHaveBeenCalled();
  });

  it('sends only the trimmed note and file metadata', async () => {
    service.dispute.mockResolvedValue({ ok: true, source: 'mock', data: { awb: 'A1' } });
    const result = await disputeDiscrepancyAction({
      ...input,
      note: `  ${input.note}  `,
      evidence: [{ ...image, content: 'SECRET' }],
    });

    expect(result).toMatchObject({ ok: true });
    expect(service.dispute).toHaveBeenCalledWith({ id: 'wd-001', note: input.note, evidence: [image] });
  });
});
