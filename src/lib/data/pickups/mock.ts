import { addDays } from '../../format/calendar';
import { indianDay } from '../../format/date';
import type { ApiError } from '../../gateway/errors';
import { mockOrdersService } from '../orders/mock';
import { mockPickupAddressService } from '../pickup-addresses/mock';
import { fromMock, type DataResult } from '../source';
import { hasMixedCarriers, parsePickupInput } from './input';
import {
  ONE_COURIER_MESSAGE,
  PICKUPS_PAGE_SIZE,
  type Pickup,
  type PickupService,
} from './types';

const COURIERS = ['ekart', 'delhivery', 'bluedart', 'shadowfax', 'dhl'];
const LABELS = ['Bengaluru warehouse', 'Gurugram store'];

// Dated from today's Indian day when the server starts, so the dashboard's Today tiles and chart
// stay meaningful every day. Newest first. The first one has a 20-character AWB and a long address label, so screens are
// tested with long values.
const TODAY = indianDay(new Date());
const SEED: Pickup[] = [
  {
    id: 'pk-001',
    pickupDate: addDays(TODAY, 1),
    window: { start: '10:00', end: '14:00' },
    carrier: 'delhivery',
    addressLabel: 'Bhubaneswar regional distribution hub',
    awbs: ['DEMOVERYLONGAWB00001', 'DEMODL000101', 'DEMODL000102'],
    status: 'scheduled',
  },
  ...Array.from({ length: 12 }, (_, index): Pickup => {
    const number = index + 2;
    const status = index % 5 === 4 ? 'cancelled' : index < 2 ? 'scheduled' : 'picked_up';
    return {
      id: `pk-${String(number).padStart(3, '0')}`,
      pickupDate: addDays(TODAY, -index),
      window: index % 3 === 2 ? null : { start: '09:30', end: '12:30' },
      carrier: COURIERS[index % COURIERS.length]!,
      addressLabel: LABELS[index % LABELS.length]!,
      awbs: Array.from({ length: (index % 4) + 1 }, (_, n) => `DEMO${100 + index}${n}XYZ`),
      status,
    };
  }),
];

let store: Pickup[] = [...SEED];
let nextId = SEED.length + 1;

function fail<T>(kind: ApiError['kind'], message: string, status = 400): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

async function manifested() {
  const result = await mockOrdersService.listOrders({ status: 'MANIFESTED', limit: 100, page: 1 });
  return result.ok ? result.data.items : [];
}

// Sample pickups live in memory, and the sample list of ready shipments does not shrink when one
// is scheduled, so sample runs can keep scheduling.
export const mockPickupsService: PickupService = {
  async listPickups({ page }) {
    const pageCount = Math.max(1, Math.ceil(store.length / PICKUPS_PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pageCount);
    const start = (current - 1) * PICKUPS_PAGE_SIZE;
    return fromMock({
      items: store.slice(start, start + PICKUPS_PAGE_SIZE).map((pickup) => ({ ...pickup })),
      page: current,
      pageCount,
    });
  },

  async readyToShip() {
    return fromMock(await manifested());
  },

  async schedulePickup(input) {
    const parsed = parsePickupInput(input);
    if (!parsed.ok) return fail('validation', parsed.message);
    const { pickupDate, window, awbs, pickupAddressId } = parsed.data;

    const ready = await manifested();
    const chosen = awbs.map((awb) => ready.find((order) => order.awb === awb));
    if (chosen.some((order) => !order)) {
      return fail('validation', 'Some selected shipments are no longer ready to ship. Refresh and try again.');
    }
    const carriers = chosen.map((order) => order!.carrier);
    if (hasMixedCarriers(carriers)) return fail('validation', ONE_COURIER_MESSAGE);

    const addresses = await mockPickupAddressService.list();
    const address = addresses.ok ? addresses.data.find((entry) => entry.id === pickupAddressId) : undefined;
    if (!address) return fail('validation', 'Choose one of your saved pickup addresses.');

    const pickup: Pickup = {
      id: `pk-${String(nextId++).padStart(3, '0')}`,
      pickupDate,
      window,
      carrier: carriers[0]!,
      addressLabel: address.label,
      awbs,
      status: 'scheduled',
    };
    store = [pickup, ...store];
    return fromMock({ ...pickup });
  },

  async getPickup(id) {
    const found = store.find((pickup) => pickup.id === id);
    return found ? fromMock({ ...found }) : fail('not_found', 'This pickup could not be found.', 404);
  },
};
