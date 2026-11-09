import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, formatDateTime, indianDay } from './date';
import { formatPaise } from './money';
import { statusLabel } from './status';
import { userLabel } from './user';

describe('formatPaise', () => {
  it('shows rupees with Indian digit grouping', () => {
    expect(formatPaise(123456789)).toBe('₹12,34,567.89');
  });

  it('shows zero', () => {
    expect(formatPaise(0)).toBe('₹0.00');
  });

  it('can leave out the decimals', () => {
    expect(formatPaise(1845000, { decimals: 0 })).toBe('₹18,450');
  });
});

describe('formatDateRange', () => {
  it('shows the last seven days in day.month.year form', () => {
    expect(formatDateRange(new Date('2026-11-04T06:00:00Z'))).toBe('28.10.2026 - 04.11.2026');
  });

  it('uses Indian time near midnight', () => {
    expect(formatDateRange(new Date('2026-11-04T20:00:00Z'))).toBe('29.10.2026 - 05.11.2026');
  });
});

describe('statusLabel', () => {
  it.each([
    ['IN_TRANSIT', 'In transit'],
    ['RTO_INITIATED', 'RTO initiated'],
    ['CREATE_REQUESTED', 'Booking requested'],
    ['CREATED', 'Booked'],
  ])('labels %s', (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });

  it('shows an unknown status as sent, rather than hiding it', () => {
    expect(statusLabel('NEW_STATUS')).toBe('NEW_STATUS');
  });
});

describe('userLabel', () => {
  it('uses the part before the @ as the name', () => {
    expect(userLabel('ops@example.com').name).toBe('ops');
  });

  it('builds initials from separated names', () => {
    expect(userLabel('riya.sharma@example.com').initials).toBe('RS');
  });

  it('uses two letters for a single name', () => {
    expect(userLabel('ops@example.com').initials).toBe('OP');
  });
});

describe('wallet dates', () => {
  it('shows a date and time in Indian time', () => {
    expect(formatDateTime('2026-07-30T17:50:33Z')).toBe('30/7/2026, 11:20:33 pm');
  });

  it('finds the Indian calendar day, which can differ from the UTC one', () => {
    expect(indianDay('2026-10-29T18:29:00Z')).toBe('2026-10-29');
    expect(indianDay('2026-10-29T18:31:00Z')).toBe('2026-10-30');
  });
});

describe('formatDate', () => {
  it('shows a short date in Indian time', () => {
    expect(formatDate('2026-07-20T06:00:00Z')).toBe('20 Jul 2026');
    expect(formatDate('2026-09-04T19:00:00Z')).toBe('5 Sep 2026');
  });
});
