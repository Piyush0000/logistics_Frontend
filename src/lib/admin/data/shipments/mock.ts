import 'server-only';

import { fromMock } from '../../../data/source';
import { matchesQuery, paginate } from '../common';
import { daysAgo, SEED_CARRIERS, SEED_MERCHANTS } from '../seed';
import type { AdminShipment, AdminShipmentsService } from './types';

const STATUSES = ['MANIFESTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERED', 'RTO_INITIATED', 'FAILED'];
const ACTIVE = SEED_MERCHANTS.filter((merchant) => merchant.status !== 'pending');

// 36 sample shipments spread across the active merchants, couriers and statuses.
const SHIPMENTS: AdminShipment[] = Array.from({ length: 36 }, (_, i) => {
  const merchant = ACTIVE[i % ACTIVE.length]!;
  const carrier = SEED_CARRIERS[i % SEED_CARRIERS.length]!;
  const status = STATUSES[i % STATUSES.length]!;
  const stuck = status === 'IN_TRANSIT' && i % 3 === 1;
  return {
    awb: `EVC${String(240_000 + i * 37).padStart(7, '0')}`,
    merchantId: merchant.id,
    merchantName: merchant.name,
    carrier,
    status,
    createdAt: daysAgo(Math.floor(i / 3), i % 5),
    lastEventAt: daysAgo(stuck ? 4 : Math.floor(i / 4), i % 3),
    stuck,
  };
});

export const mockAdminShipmentsService: AdminShipmentsService = {
  async listShipments({ q, status, merchantId, stuck, page }) {
    const rows = SHIPMENTS.filter(
      (shipment) =>
        (!status || shipment.status === status) &&
        (!merchantId || shipment.merchantId === merchantId) &&
        (stuck === undefined || shipment.stuck === stuck) &&
        matchesQuery(q, shipment.awb, shipment.merchantName),
    );
    return fromMock(paginate(rows, page));
  },
};
