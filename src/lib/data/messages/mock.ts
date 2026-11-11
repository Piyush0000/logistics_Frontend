import { fromMock } from '../source';
import type { MessagesService, MessageStats } from './types';

const WEEK: MessageStats = {
  sent: 236,
  delivered: 229,
  failed: 7,
  byStatus: [
    { status: 'PICKED_UP', count: 52 },
    { status: 'IN_TRANSIT', count: 71 },
    { status: 'OUT_FOR_DELIVERY', count: 48 },
    { status: 'DELIVERED', count: 41 },
    { status: 'NDR', count: 14 },
    { status: 'RTO', count: 10 },
  ],
};

const MONTH: MessageStats = {
  sent: 1000,
  delivered: 980,
  failed: 20,
  byStatus: [
    { status: 'PICKED_UP', count: 214 },
    { status: 'IN_TRANSIT', count: 301 },
    { status: 'OUT_FOR_DELIVERY', count: 203 },
    { status: 'DELIVERED', count: 178 },
    { status: 'NDR', count: 62 },
    { status: 'RTO', count: 42 },
  ],
};

export const mockMessagesService: MessagesService = {
  async getStats(days) {
    return fromMock(days === 30 ? MONTH : WEEK);
  },
};
