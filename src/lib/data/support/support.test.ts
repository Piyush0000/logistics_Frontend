import { describe, expect, it } from 'vitest';
import { gatewaySupportService } from './gateway';
import { supportService } from './index';
import { checkReply, checkTicket } from './input';
import { mockSupportService as mock, RESOLVED_TEST_TICKETS, SAMPLE_TICKETS } from './mock';

const valid = {
  subject: 'Courier did not pick up',
  category: 'pickup' as const,
  awb: null,
  body: 'The pickup was booked for yesterday and nobody came to collect the parcels.',
};

describe('checkTicket', () => {
  it('accepts a subject of 5 to 120 characters and a body of 20 to 5,000', () => {
    expect(checkTicket(valid)).toMatchObject({ ok: true });
    expect(checkTicket({ ...valid, subject: 'x'.repeat(5), body: 'y'.repeat(20) })).toMatchObject({ ok: true });
    expect(checkTicket({ ...valid, subject: 'x'.repeat(120), body: 'y'.repeat(5000) })).toMatchObject({ ok: true });
  });

  it('rejects a body under 20 characters, counting the trimmed text', () => {
    expect(checkTicket({ ...valid, body: 'Too short' })).toEqual({
      ok: false,
      message: 'Describe the problem in 20 to 5,000 characters.',
    });
    expect(checkTicket({ ...valid, body: `  ${'y'.repeat(19)}  ` })).toMatchObject({ ok: false });
    expect(checkTicket({ ...valid, body: 'y'.repeat(5001) })).toMatchObject({ ok: false });
  });

  it('rejects a short or long subject', () => {
    expect(checkTicket({ ...valid, subject: 'Help' })).toEqual({
      ok: false,
      message: 'The subject must be 5 to 120 characters.',
    });
    expect(checkTicket({ ...valid, subject: 'x'.repeat(121) })).toMatchObject({ ok: false });
  });

  it('rejects an unknown category', () => {
    expect(checkTicket({ ...valid, category: 'FOO' })).toMatchObject({ ok: false });
  });

  it('takes no AWB, or exactly one', () => {
    expect(checkTicket({ ...valid, awb: '  ' })).toMatchObject({ ok: true, value: { awb: null } });
    expect(checkTicket({ ...valid, awb: ' DEMOEK001 ' })).toMatchObject({ ok: true, value: { awb: 'DEMOEK001' } });
    expect(checkTicket({ ...valid, awb: 'DEMOEK001, DEMOEK002' })).toEqual({
      ok: false,
      message: 'Enter one AWB only.',
    });
    expect(checkTicket({ ...valid, awb: 'A'.repeat(41) })).toMatchObject({ ok: false });
  });

  it('trims the subject and body', () => {
    expect(checkTicket({ ...valid, subject: '  Pickup missed  ' })).toMatchObject({
      value: { subject: 'Pickup missed' },
    });
  });
});

describe('checkReply', () => {
  it('needs 1 to 5,000 characters of text', () => {
    expect(checkReply('Thanks, that worked.')).toEqual({ ok: true, value: 'Thanks, that worked.' });
    expect(checkReply('   ')).toMatchObject({ ok: false });
    expect(checkReply('x'.repeat(5001))).toMatchObject({ ok: false });
    expect(checkReply(42)).toMatchObject({ ok: false });
  });
});

describe('mock support service', () => {
  it('creates a ticket and opens it', async () => {
    const created = await mock.createTicket(valid);
    expect(created).toMatchObject({ ok: true, source: 'mock', data: { status: 'open', category: 'pickup' } });
    if (!created.ok) return;
    expect(created.data.messages).toHaveLength(1);
    expect(created.data.messages[0]).toMatchObject({ from: 'you', body: valid.body });

    const opened = await mock.getTicket(created.data.id);
    expect(opened).toMatchObject({ ok: true, data: { id: created.data.id, subject: valid.subject } });
    const list = await mock.listTickets({ page: 1 });
    expect(list.ok && list.data.items[0]?.id).toBe(created.data.id);
  });

  it('rejects a body under 20 characters', async () => {
    const result = await mock.createTicket({ ...valid, body: 'Too short' });
    expect(result).toMatchObject({ ok: false, error: { kind: 'validation', status: 400 } });
  });

  it('reopens a resolved ticket on reply', async () => {
    const resolved = SAMPLE_TICKETS.filter(({ status }) => status === 'resolved').at(-1)!;
    const reply = await mock.reply(resolved.id, 'The problem has come back.');
    expect(reply).toMatchObject({ ok: true, data: { status: 'open' } });
    if (!reply.ok) return;
    expect(reply.data.messages.at(-1)).toMatchObject({ from: 'you', body: 'The problem has come back.' });
    expect(reply.data.messages).toHaveLength(resolved.messages.length + 1);
  });

  it('keeps a reply on an open ticket open and moves an awaiting ticket to open', async () => {
    const created = await mock.createTicket(valid);
    if (!created.ok) throw new Error('create failed');
    expect(await mock.reply(created.data.id, 'More detail.')).toMatchObject({ ok: true, data: { status: 'open' } });
    const awaiting = SAMPLE_TICKETS.find(({ status }) => status === 'awaiting_you')!;
    expect(await mock.reply(awaiting.id, 'Here is the detail.')).toMatchObject({ ok: true, data: { status: 'open' } });
  });

  it('refuses an empty reply', async () => {
    const open = SAMPLE_TICKETS.find(({ status }) => status === 'open')!;
    expect(await mock.reply(open.id, '  ')).toMatchObject({ ok: false, error: { kind: 'validation' } });
  });

  it('filters by status', async () => {
    const resolved = await mock.listTickets({ status: 'resolved', page: 1 });
    expect(resolved.ok && resolved.data.items.length).toBeGreaterThan(0);
    expect(resolved.ok && resolved.data.items.every(({ status }) => status === 'resolved')).toBe(true);
    const awaiting = await mock.listTickets({ status: 'awaiting_you', page: 1 });
    expect(awaiting.ok && awaiting.data.items.every(({ status }) => status === 'awaiting_you')).toBe(true);
  });

  it('pages the list, newest first, and clamps a page past the end', async () => {
    const first = await mock.listTickets({ page: 1 });
    if (!first.ok) throw new Error('list failed');
    expect(first.data.items.length).toBeLessThanOrEqual(10);
    expect(first.data.pageCount).toBeGreaterThan(1);
    const times = first.data.items.map(({ updatedAt }) => updatedAt);
    expect([...times].sort().reverse()).toEqual(times);
    const far = await mock.listTickets({ page: 999 });
    expect(far.ok && far.data.page).toBe(far.ok && far.data.pageCount);
  });

  it('returns not found for an unknown ticket id', async () => {
    expect(await mock.getTicket('tk-nope')).toMatchObject({ ok: false, error: { kind: 'not_found', status: 404 } });
    expect(await mock.reply('tk-nope', 'Hello there')).toMatchObject({ ok: false, error: { kind: 'not_found' } });
  });

  it('keeps a long-value ticket and spare resolved tickets in the sample', () => {
    expect(SAMPLE_TICKETS.some(({ awb }) => awb?.length === 20)).toBe(true);
    expect(SAMPLE_TICKETS.filter(({ status }) => status === 'resolved').length).toBeGreaterThan(RESOLVED_TEST_TICKETS);
  });
});

describe('gateway support service', () => {
  it('shows tickets as unavailable in gateway mode', async () => {
    const unavailable = { ok: false, source: 'gateway', error: { kind: 'unavailable' } };
    expect(await gatewaySupportService.listTickets({ page: 1 })).toMatchObject(unavailable);
    expect(await gatewaySupportService.getTicket('tk-001')).toMatchObject(unavailable);
    expect(await gatewaySupportService.createTicket(valid)).toMatchObject(unavailable);
    expect(await gatewaySupportService.reply('tk-001', 'Hello there')).toMatchObject(unavailable);
  });

  it('is picked by DATA_SOURCE_SUPPORT', () => {
    expect(supportService()).toBe(mock);
    process.env.DATA_SOURCE_SUPPORT = 'gateway';
    try {
      expect(supportService()).toBe(gatewaySupportService);
    } finally {
      delete process.env.DATA_SOURCE_SUPPORT;
    }
  });
});
