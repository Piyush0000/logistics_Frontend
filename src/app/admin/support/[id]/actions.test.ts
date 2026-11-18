import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = vi.hoisted(() => ({ hasSession: true }));

vi.mock('@/lib/admin/session', () => ({
  requireAdminSession: async () => {
    if (!sessionMock.hasSession) {
      throw new Error('REDIRECT_TO_LOGIN');
    }
    return { email: 'admin@evocships.test' };
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { resetMockSupport } from '@/lib/admin/data/support/mock';
import {
  replyTicketAction,
  updateTicketPriorityAction,
  updateTicketStatusAction,
} from './actions';

describe('support actions', () => {
  beforeEach(() => {
    sessionMock.hasSession = true;
    resetMockSupport();
  });

  describe('replyTicketAction', () => {
    it('rejects unauthenticated requests', async () => {
      sessionMock.hasSession = false;
      await expect(replyTicketAction('TK-2041', 'Hello')).rejects.toThrow('REDIRECT_TO_LOGIN');
    });

    it('validates ticket identifier', async () => {
      const res = await replyTicketAction('', 'Valid message content');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Invalid ticket identifier.');
    });

    it('validates message presence and length', async () => {
      const missing = await replyTicketAction('TK-2041', undefined);
      expect(missing.ok).toBe(false);
      expect(missing.message).toBe('Reply message is required.');

      const short = await replyTicketAction('TK-2041', 'x');
      expect(short.ok).toBe(false);
      expect(short.message).toBe('Reply message must be between 2 and 5,000 characters.');

      const long = await replyTicketAction('TK-2041', 'x'.repeat(5001));
      expect(long.ok).toBe(false);
      expect(long.message).toBe('Reply message must be between 2 and 5,000 characters.');
    });

    it('posts reply and returns updated ticket', async () => {
      const res = await replyTicketAction('TK-2041', 'We have verified your account.');
      expect(res.ok).toBe(true);
      expect(res.message).toBe('Reply sent successfully.');
      if (res.ok) {
        expect(res.ticket.messages.some((m) => m.body === 'We have verified your account.')).toBe(true);
      }
    });

    it('reopens resolved ticket on reply', async () => {
      const res = await replyTicketAction('TK-2011', 'Reopening this ticket.');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.ticket.status).toBe('open');
      }
    });
  });

  describe('updateTicketStatusAction', () => {
    it('validates status', async () => {
      const res = await updateTicketStatusAction('TK-2041', 'invalid_status');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Invalid ticket status.');
    });

    it('updates status to resolved', async () => {
      const res = await updateTicketStatusAction('TK-2041', 'resolved');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.ticket.status).toBe('resolved');
      }
    });
  });

  describe('updateTicketPriorityAction', () => {
    it('validates priority', async () => {
      const res = await updateTicketPriorityAction('TK-2041', 'urgent');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Invalid ticket priority.');
    });

    it('updates priority to high', async () => {
      const res = await updateTicketPriorityAction('TK-2036', 'high');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.ticket.priority).toBe('high');
      }
    });
  });
});
