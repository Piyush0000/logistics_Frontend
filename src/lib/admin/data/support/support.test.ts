import { beforeEach, describe, expect, it } from 'vitest';
import { mockAdminSupportService, resetMockSupport } from './mock';
import type { AdminTicket } from './types';

describe('mockAdminSupportService', () => {
  beforeEach(() => {
    resetMockSupport();
  });

  describe('listTickets', () => {
    it('returns all tickets when called without filter', async () => {
      const res = await mockAdminSupportService.listTickets();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.source).toBe('mock');
        expect(res.data.length).toBeGreaterThan(0);
        expect(res.data.some((t: AdminTicket) => t.id === 'TK-2041')).toBe(true);
      }
    });

    it('filters by status string', async () => {
      const res = await mockAdminSupportService.listTickets('open');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.every((t: AdminTicket) => t.status === 'open')).toBe(true);
        expect(res.data.some((t: AdminTicket) => t.id === 'TK-2041')).toBe(true);
        expect(res.data.some((t: AdminTicket) => t.id === 'TK-2011')).toBe(false);
      }
    });

    it('filters by status in object filter', async () => {
      const res = await mockAdminSupportService.listTickets({ status: 'resolved' });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.every((t: AdminTicket) => t.status === 'resolved')).toBe(true);
        expect(res.data.some((t: AdminTicket) => t.id === 'TK-2011')).toBe(true);
      }
    });

    it('filters by priority', async () => {
      const res = await mockAdminSupportService.listTickets({ priority: 'high' });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.every((t: AdminTicket) => t.priority === 'high')).toBe(true);
        expect(res.data.map((t: AdminTicket) => t.id)).toContain('TK-2041');
        expect(res.data.map((t: AdminTicket) => t.id)).toContain('TK-2030');
      }
    });

    it('filters by merchantId', async () => {
      const res = await mockAdminSupportService.listTickets({ merchantId: 'mer_001' });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.every((t: AdminTicket) => t.merchantId === 'mer_001')).toBe(true);
        expect(res.data.map((t: AdminTicket) => t.id)).toContain('TK-2039');
        expect(res.data.map((t: AdminTicket) => t.id)).toContain('TK-2011');
      }
    });

    it('filters by query across id, subject, merchant and category', async () => {
      const byId = await mockAdminSupportService.listTickets({ query: 'TK-2041' });
      expect(byId.ok).toBe(true);
      if (byId.ok) {
        expect(byId.data.length).toBe(1);
        expect(byId.data[0]?.id).toBe('TK-2041');
      }

      const bySubject = await mockAdminSupportService.listTickets({ query: 'weight dispute' });
      expect(bySubject.ok).toBe(true);
      if (bySubject.ok) {
        expect(bySubject.data.some((t: AdminTicket) => t.id === 'TK-2039')).toBe(true);
      }

      const byMerchant = await mockAdminSupportService.listTickets({ query: 'UrbanThread' });
      expect(byMerchant.ok).toBe(true);
      if (byMerchant.ok) {
        expect(byMerchant.data.some((t: AdminTicket) => t.merchantId === 'mer_003')).toBe(true);
      }

      const byCategory = await mockAdminSupportService.listTickets({ query: 'Integrations' });
      expect(byCategory.ok).toBe(true);
      if (byCategory.ok) {
        expect(byCategory.data.some((t: AdminTicket) => t.category === 'Integrations')).toBe(true);
      }
    });
  });

  describe('getTicket', () => {
    it('returns ticket detail with conversation messages', async () => {
      const res = await mockAdminSupportService.getTicket('TK-2041');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).not.toBeNull();
        expect(res.data?.id).toBe('TK-2041');
        expect(res.data?.messages.length).toBe(3);
        expect(res.data?.messages[0]?.sender).toBe('merchant');
        expect(res.data?.messages[1]?.sender).toBe('admin');
      }
    });

    it('handles case-insensitive ticket ID lookups', async () => {
      const res = await mockAdminSupportService.getTicket('tk-2041');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).not.toBeNull();
        expect(res.data?.id).toBe('TK-2041');
      }
    });

    it('returns null for non-existent ticket', async () => {
      const res = await mockAdminSupportService.getTicket('TK-9999');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toBeNull();
      }
    });
  });

  describe('reply', () => {
    it('appends message and updates ticket updatedAt', async () => {
      const before = await mockAdminSupportService.getTicket('TK-2039');
      expect(before.ok).toBe(true);
      const initialCount = before.ok ? before.data?.messages.length ?? 0 : 0;

      const res = await mockAdminSupportService.reply('TK-2039', 'We have contacted Ekart dispute team.');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.messages.length).toBe(initialCount + 1);

        const lastMsg = res.data.messages[res.data.messages.length - 1];
        expect(lastMsg?.sender).toBe('admin');
        expect(lastMsg?.senderName).toBe('Operations Support');
        expect(lastMsg?.body).toBe('We have contacted Ekart dispute team.');
      }
    });

    it('reopens a resolved ticket when admin replies', async () => {
      const initial = await mockAdminSupportService.getTicket('TK-2011');
      expect(initial.ok).toBe(true);
      if (initial.ok) {
        expect(initial.data?.status).toBe('resolved');
      }

      const res = await mockAdminSupportService.reply('TK-2011', 'Reopening this ticket to investigate further.');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('open');
      }
    });

    it('transitions an open ticket to awaiting_merchant', async () => {
      const initial = await mockAdminSupportService.getTicket('TK-2039');
      expect(initial.ok).toBe(true);
      if (initial.ok) {
        expect(initial.data?.status).toBe('open');
      }

      const res = await mockAdminSupportService.reply('TK-2039', 'Please provide photos of the package.');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('awaiting_merchant');
      }
    });

    it('rejects messages shorter than 2 characters or longer than 5000', async () => {
      await expect(mockAdminSupportService.reply('TK-2039', ' ')).rejects.toThrow(
        /between 2 and 5,000 characters/,
      );
      await expect(mockAdminSupportService.reply('TK-2039', 'x'.repeat(5001))).rejects.toThrow(
        /between 2 and 5,000 characters/,
      );
    });

    it('throws error for non-existent ticket', async () => {
      await expect(mockAdminSupportService.reply('TK-9999', 'Hello')).rejects.toThrow(/not found/);
    });
  });

  describe('updateTicket', () => {
    it('updates status and priority', async () => {
      const res = await mockAdminSupportService.updateTicket('TK-2036', {
        status: 'resolved',
        priority: 'high',
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('resolved');
        expect(res.data.priority).toBe('high');
      }
    });

    it('throws error for non-existent ticket', async () => {
      await expect(
        mockAdminSupportService.updateTicket('TK-9999', { status: 'resolved' }),
      ).rejects.toThrow(/not found/);
    });
  });
});
