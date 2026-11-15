import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ createTicket: vi.fn(), reply: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/support', async (original) => ({
  ...(await original<typeof import('@/lib/data/support')>()),
  supportService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createTicketAction, replyAction } from './actions';

const input = {
  subject: 'Courier did not pick up',
  category: 'pickup',
  awb: '',
  body: 'The pickup was booked for yesterday and nobody came to collect the parcels.',
};

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.createTicket.mockReset();
  service.reply.mockReset();
});

describe('signed out', () => {
  it('refuses both actions before touching the service', async () => {
    session.current = null;
    expect(await createTicketAction(input)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await replyAction('tk-001', 'Thanks for the update.')).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.createTicket).not.toHaveBeenCalled();
    expect(service.reply).not.toHaveBeenCalled();
  });
});

describe('createTicketAction', () => {
  it('refuses bad input without calling the service', async () => {
    expect(await createTicketAction(null)).toMatchObject({ ok: false });
    expect(await createTicketAction({ ...input, body: 'Too short' })).toMatchObject({ ok: false });
    expect(await createTicketAction({ ...input, awb: 'A1 B2' })).toEqual({ ok: false, message: 'Enter one AWB only.' });
    expect(service.createTicket).not.toHaveBeenCalled();
  });

  it('passes the cleaned input on and returns the new id', async () => {
    service.createTicket.mockResolvedValue({ ok: true, source: 'mock', data: { id: 'tk-099' } });
    expect(await createTicketAction({ ...input, awb: ' DEMOEK001 ' })).toEqual({
      ok: true,
      id: 'tk-099',
      message: 'Ticket raised.',
    });
    expect(service.createTicket).toHaveBeenCalledWith({ ...input, awb: 'DEMOEK001' });
  });

  it('returns the service message on failure', async () => {
    service.createTicket.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
    expect(await createTicketAction(input)).toEqual({ ok: false, message: 'This data is not available yet.' });
  });
});

describe('replyAction', () => {
  it('refuses a bad id or an empty reply', async () => {
    expect(await replyAction(7, 'Hello there')).toMatchObject({ ok: false });
    expect(await replyAction('tk-001', '   ')).toMatchObject({ ok: false });
    expect(service.reply).not.toHaveBeenCalled();
  });

  it('sends the trimmed reply', async () => {
    service.reply.mockResolvedValue({ ok: true, source: 'mock', data: { id: 'tk-001' } });
    expect(await replyAction('tk-001', '  Thanks.  ')).toMatchObject({ ok: true });
    expect(service.reply).toHaveBeenCalledWith('tk-001', 'Thanks.');
  });
});
