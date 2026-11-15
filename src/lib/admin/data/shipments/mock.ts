import 'server-only';

import { fromMock } from '../../../data/source';
import { matchesQuery, paginate } from '../common';
import { mockNotFound } from '../not-found';
import { daysAgo, SEED_CARRIERS, SEED_MERCHANTS } from '../seed';
import type {
  AdminNdrShipment,
  AdminRtoShipment,
  AdminShipmentDetail,
  AdminShipmentsService,
  ShipmentTimelineEvent,
} from './types';

const STATUSES = ['MANIFESTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERED', 'RTO_INITIATED', 'FAILED'];
const ACTIVE = SEED_MERCHANTS.filter((merchant) => merchant.status !== 'pending');

const CITIES = ['Bengaluru', 'Delhi', 'Mumbai', 'Pune', 'Kolkata', 'Hyderabad', 'Jaipur', 'Ahmedabad', 'Chennai'];
const RECIPIENTS = ['Rahul Sharma', 'Priya Patel', 'Ananya Iyer', 'Vikram Singh', 'Deepak Verma', 'Sneha Roy', 'Amit Sen'];

// 36 sample shipments spread across active merchants, couriers and statuses.
const SHIPMENTS_RAW: AdminShipmentDetail[] = Array.from({ length: 36 }, (_, i) => {
  const merchant = ACTIVE[i % ACTIVE.length]!;
  const carrier = SEED_CARRIERS[i % SEED_CARRIERS.length]!;
  const status = STATUSES[i % STATUSES.length]!;
  const stuck = status === 'IN_TRANSIT' && i % 3 === 1;
  const awb = `EVC${240_000 + i * 37}`;
  const createdAt = daysAgo(Math.floor(i / 3) + 2, (i % 5) + 1);
  const lastEventAt = daysAgo(stuck ? 4 : Math.floor(i / 4), (i % 3) + 1);
  const destination = CITIES[(i + 3) % CITIES.length]!;
  const origin = merchant.city;

  // Build timeline events (newest first)
  const timeline: ShipmentTimelineEvent[] = [];

  if (status === 'DELIVERED') {
    timeline.push({
      status: 'DELIVERED',
      rawStatus: 'Shipment delivered successfully to recipient',
      location: destination,
      occurredAt: lastEventAt,
    });
    timeline.push({
      status: 'OUT_FOR_DELIVERY',
      rawStatus: 'Out for delivery with delivery agent',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4), (i % 3) + 5),
    });
    timeline.push({
      status: 'IN_TRANSIT',
      rawStatus: 'Arrived at destination delivery facility',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4) + 1, 2),
    });
    timeline.push({
      status: 'PICKED_UP',
      rawStatus: 'Package picked up from seller facility',
      location: origin,
      occurredAt: daysAgo(Math.floor(i / 4) + 2, 4),
    });
    timeline.push({
      status: 'MANIFESTED',
      rawStatus: 'Shipment created and manifested',
      location: origin,
      occurredAt: createdAt,
    });
  } else if (status === 'OUT_FOR_DELIVERY') {
    timeline.push({
      status: 'OUT_FOR_DELIVERY',
      rawStatus: 'Out for delivery with delivery agent',
      location: destination,
      occurredAt: lastEventAt,
    });
    timeline.push({
      status: 'IN_TRANSIT',
      rawStatus: 'Arrived at destination delivery station',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4) + 1, 3),
    });
    timeline.push({
      status: 'PICKED_UP',
      rawStatus: 'Package picked up from seller',
      location: origin,
      occurredAt: daysAgo(Math.floor(i / 4) + 2, 2),
    });
    timeline.push({
      status: 'MANIFESTED',
      rawStatus: 'Shipment registered',
      location: origin,
      occurredAt: createdAt,
    });
  } else if (status === 'IN_TRANSIT') {
    timeline.push({
      status: 'IN_TRANSIT',
      rawStatus: stuck
        ? 'Shipment delayed: No movement detected at sorting hub for 4 days'
        : 'In transit to destination sorting hub',
      location: stuck ? `${destination} Gateway Hub` : 'Central Sorting Hub',
      occurredAt: lastEventAt,
    });
    timeline.push({
      status: 'PICKED_UP',
      rawStatus: 'Package received at origin facility',
      location: origin,
      occurredAt: daysAgo(Math.floor(i / 4) + (stuck ? 5 : 1), 3),
    });
    timeline.push({
      status: 'MANIFESTED',
      rawStatus: 'Shipment manifested',
      location: origin,
      occurredAt: createdAt,
    });
  } else if (status === 'RTO_INITIATED') {
    timeline.push({
      status: 'RTO_INITIATED',
      rawStatus: 'RTO initiated: Customer refused to accept order at doorstep',
      location: destination,
      occurredAt: lastEventAt,
    });
    timeline.push({
      status: 'FAILED',
      rawStatus: 'Delivery attempt failed: Consignee refused delivery',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4) + 1, 2),
    });
    timeline.push({
      status: 'OUT_FOR_DELIVERY',
      rawStatus: 'Out for delivery',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4) + 1, 6),
    });
    timeline.push({
      status: 'IN_TRANSIT',
      rawStatus: 'In transit',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4) + 2, 1),
    });
    timeline.push({
      status: 'MANIFESTED',
      rawStatus: 'Manifest created',
      location: origin,
      occurredAt: createdAt,
    });
  } else if (status === 'FAILED') {
    timeline.push({
      status: 'FAILED',
      rawStatus: 'Delivery failed: Customer phone unreachable and gate locked',
      location: destination,
      occurredAt: lastEventAt,
    });
    timeline.push({
      status: 'OUT_FOR_DELIVERY',
      rawStatus: 'Out for delivery',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4), 6),
    });
    timeline.push({
      status: 'IN_TRANSIT',
      rawStatus: 'In transit at hub',
      location: destination,
      occurredAt: daysAgo(Math.floor(i / 4) + 1, 2),
    });
    timeline.push({
      status: 'MANIFESTED',
      rawStatus: 'Order manifested',
      location: origin,
      occurredAt: createdAt,
    });
  } else {
    // MANIFESTED
    timeline.push({
      status: 'MANIFESTED',
      rawStatus: 'Shipment created and awaiting pickup from seller',
      location: origin,
      occurredAt: createdAt,
    });
  }

  return {
    awb,
    merchantId: merchant.id,
    merchantName: merchant.name,
    carrier,
    status,
    createdAt,
    lastEventAt,
    stuck,
    origin,
    destination,
    recipientName: RECIPIENTS[i % RECIPIENTS.length]!,
    recipientPhone: `+9198765${String(10000 + i).slice(-5)}`,
    weightGrams: ((i * 150 + 500) % 2500) + 350,
    codAmountPaise: i % 2 === 0 ? ((i * 35000 + 49900) % 350000) : undefined,
    timeline,
  };
});

// NDR shipments derived from failed / delivery issues
const NDR_REASONS = [
  'Customer phone switched off / unreachable',
  'Address incomplete or landmark missing',
  'Customer requested delivery rescheduling for next week',
  'Customer refused COD payment at doorstep',
];

const NDR_SHIPMENTS: AdminNdrShipment[] = SHIPMENTS_RAW
  .filter((s) => s.status === 'FAILED' || s.status === 'RTO_INITIATED' || s.stuck)
  .slice(0, 10)
  .map((s, idx) => ({
    ...s,
    ndrReason: NDR_REASONS[idx % NDR_REASONS.length]!,
    attemptsCount: (idx % 3) + 1,
    lastAttemptAt: s.lastEventAt,
    actionRequired: idx % 2 === 0 ? 'Verify alternate contact number' : 'Confirm re-attempt schedule',
  }));

// RTO shipments
const RTO_REASONS = [
  'Buyer rejected order upon delivery',
  'Undelivered after 3 consecutive attempts',
  'Incorrect delivery pincode / destination unreachable',
];

const RTO_SHIPMENTS: AdminRtoShipment[] = SHIPMENTS_RAW
  .filter((s) => s.status === 'RTO_INITIATED')
  .map((s, idx) => ({
    ...s,
    rtoReason: RTO_REASONS[idx % RTO_REASONS.length]!,
    rtoInitiatedAt: s.lastEventAt,
    rtoDeliveredAt: idx % 2 === 0 ? daysAgo(1, 4) : null,
  }));

export const mockAdminShipmentsService: AdminShipmentsService = {
  async listShipments({ q, status, merchantId, stuck, page, pageSize }) {
    const rows = SHIPMENTS_RAW.filter(
      (shipment) =>
        (!status || shipment.status === status) &&
        (!merchantId || shipment.merchantId === merchantId) &&
        (stuck === undefined || shipment.stuck === stuck) &&
        matchesQuery(q, shipment.awb, shipment.merchantName, shipment.carrier, shipment.destination),
    );
    return fromMock(paginate(rows, page, pageSize));
  },

  async getShipment(awb) {
    const shipment = SHIPMENTS_RAW.find((entry) => entry.awb.toUpperCase() === awb.toUpperCase());
    return shipment ? fromMock(shipment) : mockNotFound('Shipment');
  },

  async listNdrShipments(query = {}) {
    const rows = NDR_SHIPMENTS.filter((entry) =>
      matchesQuery(query.q, entry.awb, entry.merchantName, entry.ndrReason, entry.carrier),
    );
    return fromMock(paginate(rows, query.page));
  },

  async listRtoShipments(query = {}) {
    const rows = RTO_SHIPMENTS.filter((entry) =>
      matchesQuery(query.q, entry.awb, entry.merchantName, entry.rtoReason, entry.carrier),
    );
    return fromMock(paginate(rows, query.page));
  },
};
