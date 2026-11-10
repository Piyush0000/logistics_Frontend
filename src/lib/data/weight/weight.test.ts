import { describe, expect, it } from 'vitest';
import { gatewayWeightService } from './gateway';
import { weightService } from './index';
import {
  checkDispute,
  isResponseWindowClosed,
  MAX_IMAGE_BYTES,
  MAX_NOTE_LENGTH,
  MIN_NOTE_LENGTH,
} from './input';
import { mockWeightService as mock, SAMPLE_DISCREPANCIES } from './mock';

const image = { name: 'parcel.jpg', type: 'image/jpeg', size: 200_000 };
const note = 'The parcel was weighed on our scale at 0.5 kg.';

describe('isResponseWindowClosed', () => {
  // 10 Nov 2026, 10:00 in India.
  const NOW = new Date('2026-11-10T04:30:00.000Z');

  it('is open through the last day and closed the day after', () => {
    expect(isResponseWindowClosed('2026-11-10', NOW)).toBe(false);
    expect(isResponseWindowClosed('2026-11-11', NOW)).toBe(false);
    expect(isResponseWindowClosed('2026-11-09', NOW)).toBe(true);
  });

  it('counts the day in Indian time, not UTC', () => {
    // 11 Nov 01:30 in India is still 10 Nov in UTC.
    const lateEvening = new Date('2026-11-10T20:00:00.000Z');
    expect(isResponseWindowClosed('2026-11-10', lateEvening)).toBe(true);
    expect(isResponseWindowClosed('2026-11-11', lateEvening)).toBe(false);
  });
});

describe('checkDispute', () => {
  it('accepts a note of 10 to 1,000 characters with 1 to 3 JPG or PNG images up to 5 MB', () => {
    expect(checkDispute({ note, evidence: [image] })).toBeNull();
    expect(checkDispute({ note: 'x'.repeat(MIN_NOTE_LENGTH), evidence: [image] })).toBeNull();
    expect(checkDispute({ note: 'x'.repeat(MAX_NOTE_LENGTH), evidence: [image] })).toBeNull();
    const png = { name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES };
    expect(checkDispute({ note, evidence: [image, png, png] })).toBeNull();
  });

  it('refuses a short or long note, counting the trimmed text', () => {
    expect(checkDispute({ note: 'too short', evidence: [image] })).toMatch(/at least 10/);
    expect(checkDispute({ note: `   ${'x'.repeat(9)}   `, evidence: [image] })).toMatch(/at least 10/);
    expect(checkDispute({ note: 'x'.repeat(1001), evidence: [image] })).toMatch(/1,000/);
  });

  it('refuses no images and more than 3', () => {
    expect(checkDispute({ note, evidence: [] })).toBe('Add at least 1 image as evidence.');
    expect(checkDispute({ note, evidence: [image, image, image, image] })).toBe(
      'Add no more than 3 images.',
    );
  });

  it('refuses other types, empty files and files over 5 MB', () => {
    expect(checkDispute({ note, evidence: [{ ...image, name: 'a.gif', type: 'image/gif' }] })).toBe(
      'a.gif is not a JPG or PNG image.',
    );
    expect(
      checkDispute({ note, evidence: [{ ...image, name: 'a.pdf', type: 'application/pdf' }] }),
    ).toMatch(/not a JPG or PNG/);
    expect(
      checkDispute({ note, evidence: [{ ...image, name: 'big.png', size: MAX_IMAGE_BYTES + 1 }] }),
    ).toBe('big.png is larger than 5 MB.');
    expect(checkDispute({ note, evidence: [{ ...image, name: 'empty.png', size: 0 }] })).toBe(
      'empty.png is empty.',
    );
  });
});

describe('sample data', () => {
  it('covers every status, a closed window and a long value', () => {
    const statuses = new Set(SAMPLE_DISCREPANCIES.map(({ status }) => status));
    expect([...statuses].sort()).toEqual(['accepted', 'disputed', 'open', 'resolved']);
    expect(SAMPLE_DISCREPANCIES.some((row) => isResponseWindowClosed(row.respondBy))).toBe(true);
    expect(SAMPLE_DISCREPANCIES.some((row) => row.awb.length >= 20)).toBe(true);
    expect(SAMPLE_DISCREPANCIES.some((row) => row.extraChargePaise >= 1_00_00_000_00)).toBe(true);
  });
});

describe('mockWeightService', () => {
  it('lists newest first, 10 a page, with source: mock', async () => {
    const result = await mock.listDiscrepancies({ page: 1 });
    expect(result.ok && result.source).toBe('mock');
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(10);
    expect(result.data.pageCount).toBe(2);
    const times = result.data.items.map((row) => row.raisedAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('filters by status and by AWB text', async () => {
    const disputed = await mock.listDiscrepancies({ status: 'disputed', page: 1 });
    if (!disputed.ok) throw new Error('list failed');
    expect(disputed.data.items.length).toBeGreaterThan(0);
    expect(disputed.data.items.every((row) => row.status === 'disputed')).toBe(true);

    const found = await mock.listDiscrepancies({ q: 'demolong', page: 1 });
    if (!found.ok) throw new Error('list failed');
    expect(found.data.items.map((row) => row.awb)).toEqual(['DEMOLONGAWBWEIGHT001']);

    const none = await mock.listDiscrepancies({ q: 'no-such-awb', page: 1 });
    expect(none.ok && none.data.items).toEqual([]);
  });

  it('clamps a page past the end', async () => {
    const result = await mock.listDiscrepancies({ page: 99 });
    expect(result.ok && result.data.page).toBe(2);
  });

  it('accepts an open row once, then refuses a second answer', async () => {
    const before = await mock.getSummary();
    const accepted = await mock.accept('wd-006');
    expect(accepted.ok && accepted.data.status).toBe('accepted');

    const after = await mock.getSummary();
    if (!before.ok || !after.ok) throw new Error('summary failed');
    expect(after.data.open).toBe(before.data.open - 1);

    const again = await mock.accept('wd-006');
    expect(again).toMatchObject({ ok: false, error: { kind: 'conflict' } });
  });

  it('disputes an open row and keeps no file content', async () => {
    const result = await mock.dispute({ id: 'wd-005', note, evidence: [image] });
    expect(result.ok && result.data.status).toBe('disputed');
    expect(JSON.stringify(result)).not.toContain('base64');
  });

  it('refuses a dispute with bad evidence, after the window, or for an unknown row', async () => {
    expect(await mock.dispute({ id: 'wd-004', note, evidence: [] })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    const closed = await mock.dispute({ id: 'wd-007', note, evidence: [image] });
    expect(closed).toMatchObject({ ok: false, error: { kind: 'conflict' } });
    expect(!closed.ok && closed.error.message).toMatch(/window has closed/);
    expect(await mock.dispute({ id: 'nope', note, evidence: [image] })).toMatchObject({
      ok: false,
      error: { kind: 'not_found' },
    });
    expect(await mock.accept('nope')).toMatchObject({ ok: false, error: { kind: 'not_found' } });
  });
});

describe('gatewayWeightService', () => {
  const unavailable = { ok: false, source: 'gateway', error: { kind: 'unavailable' } };

  it('reports every call as unavailable', async () => {
    expect(await gatewayWeightService.getSummary()).toMatchObject(unavailable);
    expect(await gatewayWeightService.listDiscrepancies({ page: 1 })).toMatchObject(unavailable);
    expect(await gatewayWeightService.accept('x')).toMatchObject(unavailable);
    expect(await gatewayWeightService.dispute({ id: 'x', note, evidence: [image] })).toMatchObject(
      unavailable,
    );
  });
});

describe('weightService resolution', () => {
  it('uses mock by default and gateway when set', () => {
    delete process.env.DATA_SOURCE_WEIGHT;
    expect(weightService()).toBe(mock);
    process.env.DATA_SOURCE_WEIGHT = 'gateway';
    expect(weightService()).toBe(gatewayWeightService);
    delete process.env.DATA_SOURCE_WEIGHT;
  });
});
