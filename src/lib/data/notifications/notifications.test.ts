import { describe, expect, it } from 'vitest';
import { gatewayNotificationService } from './gateway';
import { notificationService } from './index';
import { MAX_TEMPLATE_LENGTH, parseNotificationInput } from './input';
import { createMockNotificationService } from './mock';
import { NOTIFY_CHANNELS, NOTIFY_EVENTS, type NotificationSettings } from './types';

async function sample(): Promise<NotificationSettings> {
  const result = await createMockNotificationService().get();
  if (!result.ok) throw new Error('sample failed');
  return result.data;
}

describe('mock service', () => {
  it('has a row for every event and channel and a template for every event', async () => {
    const settings = await sample();
    for (const event of NOTIFY_EVENTS) {
      expect(settings.templates[event].length).toBeGreaterThan(0);
      for (const channel of NOTIFY_CHANNELS) expect(typeof settings.matrix[event][channel]).toBe('boolean');
    }
  });

  it('saves a change and returns it', async () => {
    const service = createMockNotificationService();
    const before = await sample();
    const flipped = !before.matrix.DELIVERED.email;
    const next = structuredClone(before);
    next.matrix.DELIVERED.email = flipped;
    const saved = await service.save(next);
    expect(saved).toMatchObject({ ok: true, source: 'mock' });
    const again = await service.get();
    expect(again.ok && again.data.matrix.DELIVERED.email).toBe(flipped);
  });

  it('returns copies, so a caller cannot change the stored settings', async () => {
    const service = createMockNotificationService();
    const first = await service.get();
    if (first.ok) first.data.matrix.DELIVERED.sms = !first.data.matrix.DELIVERED.sms;
    const second = await service.get();
    const fresh = await sample();
    expect(second.ok && second.data.matrix.DELIVERED.sms).toBe(fresh.matrix.DELIVERED.sms);
  });

  it('refuses unknown variables', async () => {
    const next = await sample();
    next.templates.DELIVERED = 'Hi {{oops}}';
    const result = await createMockNotificationService().save(next);
    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'validation', message: 'Unknown variable: {{oops}}' },
    });
  });
});

describe('parseNotificationInput', () => {
  it('accepts valid settings and drops unknown keys', async () => {
    const settings = await sample();
    const parsed = parseNotificationInput({ ...settings, extra: 1 });
    expect(parsed).toEqual({ ok: true, value: settings });
  });

  it('names the first unknown variable', async () => {
    const settings = await sample();
    settings.templates.IN_TRANSIT = 'Parcel {{awb}} {{a}} {{b}}';
    expect(parseNotificationInput(settings)).toMatchObject({
      ok: false,
      message: 'Unknown variable: {{a}}',
      errors: { IN_TRANSIT: 'Unknown variable: {{a}}' },
    });
  });

  it('refuses empty and over-long templates', async () => {
    const settings = await sample();
    settings.templates.MANIFESTED = '   ';
    expect(parseNotificationInput(settings)).toMatchObject({ ok: false, errors: { MANIFESTED: 'Enter a message.' } });
    settings.templates.MANIFESTED = 'a'.repeat(MAX_TEMPLATE_LENGTH + 1);
    expect(parseNotificationInput(settings)).toMatchObject({
      ok: false,
      errors: { MANIFESTED: expect.stringContaining(String(MAX_TEMPLATE_LENGTH)) },
    });
  });

  it('refuses a missing event, a non-boolean switch and non-objects', async () => {
    const settings = await sample();
    const missing = structuredClone(settings) as unknown as { matrix: Record<string, unknown> };
    delete missing.matrix.DELIVERED;
    expect(parseNotificationInput(missing).ok).toBe(false);
    const bad = structuredClone(settings) as unknown as { matrix: { DELIVERED: { sms: unknown } } };
    bad.matrix.DELIVERED.sms = 'yes';
    expect(parseNotificationInput(bad).ok).toBe(false);
    for (const input of [null, undefined, 'x', 5, []]) expect(parseNotificationInput(input).ok).toBe(false);
  });
});

describe('gateway service', () => {
  it('has no route, so both calls are unavailable', async () => {
    const expected = { ok: false, source: 'gateway', error: { kind: 'unavailable' } };
    expect(await gatewayNotificationService.get()).toMatchObject(expected);
    expect(await gatewayNotificationService.save(await sample())).toMatchObject(expected);
  });

  it('is picked by DATA_SOURCE_NOTIFICATIONS', () => {
    const previous = process.env.DATA_SOURCE_NOTIFICATIONS;
    process.env.DATA_SOURCE_NOTIFICATIONS = 'gateway';
    expect(notificationService()).toBe(gatewayNotificationService);
    delete process.env.DATA_SOURCE_NOTIFICATIONS;
    expect(notificationService()).not.toBe(gatewayNotificationService);
    if (previous !== undefined) process.env.DATA_SOURCE_NOTIFICATIONS = previous;
  });
});

describe('changes', () => {
  it('diffs only what changed and applies it onto other settings', async () => {
    const { diffNotificationSettings, applyNotificationChanges } = await import('./input');
    const base = await sample();
    const edited = structuredClone(base);
    edited.matrix.DELIVERED.whatsapp = !base.matrix.DELIVERED.whatsapp;
    edited.templates.IN_TRANSIT = 'Changed {{awb}}';
    const changes = diffNotificationSettings(base, edited);
    expect(changes).toEqual({
      events: {
        DELIVERED: { matrix: { whatsapp: edited.matrix.DELIVERED.whatsapp } },
        IN_TRANSIT: { template: 'Changed {{awb}}' },
      },
    });
    expect(diffNotificationSettings(base, base)).toEqual({ events: {} });

    const elsewhere = structuredClone(base);
    elsewhere.templates.MANIFESTED = 'Saved elsewhere {{awb}}';
    const merged = applyNotificationChanges(elsewhere, changes);
    expect(merged.templates.MANIFESTED).toBe('Saved elsewhere {{awb}}');
    expect(merged.templates.IN_TRANSIT).toBe('Changed {{awb}}');
    expect(merged.matrix.DELIVERED.whatsapp).toBe(edited.matrix.DELIVERED.whatsapp);
  });
});
