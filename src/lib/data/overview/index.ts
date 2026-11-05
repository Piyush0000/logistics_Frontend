import { notAvailable } from '../not-available';
import { fromMock, resolveDataSource, type DataResult } from '../source';

export interface Overview {
  ordersToday: number;
  ordersChangePercent: number;
  revenueTodayPaise: number;
  revenueChangePercent: number;
  averageShippingPaise: number;
  minimumShippingPaise: number;
  deliveriesToday: number;
  deliveriesChangePercent: number;
  ndr: { open: number; reattempted: number; delivered: number; returned: number };
}

const SAMPLE: Overview = {
  ordersToday: 24,
  ordersChangePercent: 12,
  revenueTodayPaise: 1845000,
  revenueChangePercent: 8,
  averageShippingPaise: 6800,
  minimumShippingPaise: 4200,
  deliveriesToday: 17,
  deliveriesChangePercent: 5,
  ndr: { open: 6, reattempted: 3, delivered: 2, returned: 1 },
};

interface OverviewService {
  getOverview(): Promise<DataResult<Overview>>;
}

const mockOverviewService: OverviewService = {
  async getOverview() {
    return fromMock(SAMPLE);
  },
};

// The backend has no routes for these figures yet.
const gatewayOverviewService: OverviewService = { getOverview: notAvailable };

export function overviewService(): OverviewService {
  return resolveDataSource('overview') === 'gateway' ? gatewayOverviewService : mockOverviewService;
}
