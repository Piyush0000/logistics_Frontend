import 'server-only';

import { fromMock } from '../source';
import type { MessagesService, MessageStats } from './types';

const WEEK: MessageStats = {
  sent: 212,
  skipped: 18,
  failed: 6,
  chargedPaise: 21_200,
  byStatus: [
    { status: 'MANIFESTED', count: 52 },
    { status: 'OUT_FOR_DELIVERY', count: 71 },
    { status: 'DELIVERED', count: 68 },
    { status: 'NDR', count: 14 },
    { status: 'RTO_INITIATED', count: 7 },
  ],
  reasons: [
    { reason: 'switched off by the merchant', count: 12 },
    { reason: 'no valid customer phone', count: 6 },
    { reason: 'WAPI answered 400', count: 6 },
  ],
};

const MONTH: MessageStats = {
  ...WEEK,
  sent: 848,
  skipped: 64,
  failed: 21,
  chargedPaise: 84_800,
  byStatus: WEEK.byStatus.map((row) => ({ ...row, count: row.count * 4 })),
};

export const mockMessagesService: MessagesService = {
  async getStats(days) {
    return fromMock(days === 30 ? MONTH : WEEK);
  },
};
