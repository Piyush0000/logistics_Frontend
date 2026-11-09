import type { NormalizedStatus } from '@logicore/contracts';
import { fromMock, type DataResult } from '../source';
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  OrderDetail,
  OrderListQuery,
  OrderListResult,
  OrdersService,
  OrderSummary,
} from './types';

const INITIAL_MOCK_ORDERS: OrderDetail[] = [
  {
    shipment_id: '10000000-0000-4000-8000-000000000001',
    reference_id: 'DEMO-001',
    carrier: 'ekart',
    awb: 'DEMOEK001',
    status: 'IN_TRANSIT',
    created_at: '2026-10-23T08:00:00.000Z',
    last_status_at: '2026-10-23T10:00:00.000Z',
    stuck: false,
    origin: {
      name: 'Central Hub',
      phone: '9876543210',
      line1: 'Plot 42, Electronic City',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      pincode: '560100',
    },
    destination: {
      name: 'Aditi Rao',
      phone: '9988776655',
      line1: 'Flat 302, Green Glen Layout',
      line2: 'Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      pincode: '560103',
    },
    weight_kg: 1.2,
    dimensions: { length_cm: 25, width_cm: 15, height_cm: 10 },
    items: [
      { name: 'Ergonomic Keyboard', quantity: 1, unit_price: 3499 },
    ],
    payment_type: 'PREPAID',
    cod_amount: 0,
    total_amount_paise: 349900,
    timeline: [
      {
        status: 'MANIFESTED',
        location: 'Bengaluru Hub',
        timestamp: '2026-10-23T08:00:00.000Z',
        description: 'Shipment data received and package manifested',
      },
      {
        status: 'PICKUP_SCHEDULED',
        location: 'Bengaluru Hub',
        timestamp: '2026-10-23T08:30:00.000Z',
        description: 'Pickup assigned to field executive',
      },
      {
        status: 'IN_TRANSIT',
        location: 'South City Sort Center',
        timestamp: '2026-10-23T10:00:00.000Z',
        description: 'Package in transit to delivery facility',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000002',
    reference_id: 'DEMO-002',
    carrier: 'delhivery',
    awb: 'DEMODL002',
    status: 'OUT_FOR_DELIVERY',
    created_at: '2026-10-22T09:00:00.000Z',
    last_status_at: '2026-10-23T06:00:00.000Z',
    stuck: false,
    origin: {
      name: 'Gurugram Fulfillment Center',
      phone: '9876543211',
      line1: 'Udyog Vihar Phase 4',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'IN',
      pincode: '122015',
    },
    destination: {
      name: 'Vikram Mehta',
      phone: '9811223344',
      line1: 'Tower B, DLF Phase 5',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'IN',
      pincode: '122002',
    },
    weight_kg: 0.8,
    dimensions: { length_cm: 20, width_cm: 12, height_cm: 8 },
    items: [
      { name: 'Noise Cancelling Earbuds', quantity: 1, unit_price: 2499 },
    ],
    payment_type: 'COD',
    cod_amount: 2499,
    total_amount_paise: 249900,
    timeline: [
      {
        status: 'MANIFESTED',
        location: 'Gurugram FC',
        timestamp: '2026-10-22T09:00:00.000Z',
        description: 'Manifest created',
      },
      {
        status: 'IN_TRANSIT',
        location: 'Delhi Main Hub',
        timestamp: '2026-10-22T18:00:00.000Z',
        description: 'Arrived at sorting hub',
      },
      {
        status: 'OUT_FOR_DELIVERY',
        location: 'Gurugram Sector 43 DC',
        timestamp: '2026-10-23T06:00:00.000Z',
        description: 'Out for delivery with courier agent',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000003',
    reference_id: 'DEMO-003',
    carrier: 'ekart',
    awb: 'DEMOEK003',
    status: 'DELIVERED',
    created_at: '2026-10-21T12:00:00.000Z',
    last_status_at: '2026-10-22T15:00:00.000Z',
    stuck: false,
    origin: {
      name: 'Mumbai Warehouse',
      phone: '9876543212',
      line1: 'Bhiwandi Logistic Park',
      city: 'Thane',
      state: 'Maharashtra',
      country: 'IN',
      pincode: '421302',
    },
    destination: {
      name: 'Priya Iyer',
      phone: '9822334455',
      line1: 'A-14 Sea View Apts, Worli',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      pincode: '400018',
    },
    weight_kg: 2.1,
    dimensions: { length_cm: 30, width_cm: 20, height_cm: 15 },
    items: [
      { name: 'Ceramic Cookware Set', quantity: 1, unit_price: 4999 },
    ],
    payment_type: 'PREPAID',
    cod_amount: 0,
    total_amount_paise: 499900,
    timeline: [
      {
        status: 'DELIVERED',
        location: 'Mumbai Worli',
        timestamp: '2026-10-22T15:00:00.000Z',
        description: 'Package delivered to recipient',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000004',
    reference_id: 'DEMO-004',
    carrier: 'shadowfax',
    awb: 'DEMOSF004',
    status: 'IN_TRANSIT',
    created_at: '2026-10-20T07:00:00.000Z',
    last_status_at: '2026-10-20T08:00:00.000Z',
    stuck: true,
    origin: {
      name: 'Hyderabad FC',
      phone: '9876543213',
      line1: 'Shamshabad Air Cargo',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'IN',
      pincode: '500409',
    },
    destination: {
      name: 'Suresh Reddy',
      phone: '9833445566',
      line1: 'Plot 88, Banjara Hills Rd 12',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'IN',
      pincode: '500034',
    },
    weight_kg: 0.5,
    dimensions: { length_cm: 15, width_cm: 10, height_cm: 5 },
    items: [{ name: 'Fitness Band', quantity: 1, unit_price: 1899 }],
    payment_type: 'PREPAID',
    cod_amount: 0,
    total_amount_paise: 189900,
    timeline: [
      {
        status: 'IN_TRANSIT',
        location: 'Hyderabad Sort Center',
        timestamp: '2026-10-20T08:00:00.000Z',
        description: 'Delayed at transfer hub',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000005',
    reference_id: 'DEMO-005',
    carrier: 'bluedart',
    awb: 'DEMOBD005',
    status: 'MANIFESTED',
    created_at: '2026-10-19T11:00:00.000Z',
    last_status_at: '2026-10-19T12:00:00.000Z',
    stuck: false,
    origin: {
      name: 'Chennai Central',
      phone: '9876543214',
      line1: 'Ambattur Industrial Estate',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'IN',
      pincode: '600058',
    },
    destination: {
      name: 'Karthik Subramanian',
      phone: '9844556677',
      line1: '12 Gandhi Road, T Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'IN',
      pincode: '600017',
    },
    weight_kg: 1.0,
    dimensions: { length_cm: 20, width_cm: 20, height_cm: 10 },
    items: [
      { name: 'Smart Home Speaker', quantity: 1, unit_price: 3999 },
    ],
    payment_type: 'COD',
    cod_amount: 3999,
    total_amount_paise: 399900,
    timeline: [
      {
        status: 'MANIFESTED',
        location: 'Chennai Hub',
        timestamp: '2026-10-19T12:00:00.000Z',
        description: 'Manifested ready for pickup',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000006',
    reference_id: 'DEMO-006',
    carrier: 'dhl',
    awb: 'DEMODH006',
    status: 'RTO_INITIATED',
    created_at: '2026-10-18T10:00:00.000Z',
    last_status_at: '2026-10-21T10:00:00.000Z',
    stuck: false,
    origin: {
      name: 'Delhi NCR Hub',
      phone: '9876543215',
      line1: 'Okhla Phase 3',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'IN',
      pincode: '110020',
    },
    destination: {
      name: 'Sunil Verma',
      phone: '9855667788',
      line1: 'Block C, Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'IN',
      pincode: '201309',
    },
    weight_kg: 3.5,
    dimensions: { length_cm: 40, width_cm: 30, height_cm: 20 },
    items: [
      { name: 'Office Ergonomic Chair', quantity: 1, unit_price: 8999 },
    ],
    payment_type: 'COD',
    cod_amount: 8999,
    total_amount_paise: 899900,
    timeline: [
      {
        status: 'OUT_FOR_DELIVERY',
        location: 'Noida DC',
        timestamp: '2026-10-20T07:00:00.000Z',
        description: 'Customer unavailable on delivery attempt',
      },
      {
        status: 'RTO_INITIATED',
        location: 'Noida DC',
        timestamp: '2026-10-21T10:00:00.000Z',
        description: 'Return to origin initiated after non-delivery',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000007',
    reference_id: 'DEMO-007',
    carrier: 'ekart',
    awb: 'DEMOEK007',
    status: 'FAILED',
    created_at: '2026-10-17T10:00:00.000Z',
    last_status_at: '2026-10-17T10:20:00.000Z',
    stuck: false,
    origin: {
      name: 'Bengaluru Central',
      phone: '9876543210',
      line1: 'Peenya Industrial Area',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      pincode: '560058',
    },
    destination: {
      name: 'Neha Kapoor',
      phone: '9866778899',
      line1: 'Invalid Address Lane',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      pincode: '560001',
    },
    weight_kg: 0.3,
    dimensions: { length_cm: 10, width_cm: 10, height_cm: 5 },
    items: [{ name: 'Phone Screen Guard', quantity: 2, unit_price: 299 }],
    payment_type: 'PREPAID',
    cod_amount: 0,
    total_amount_paise: 59800,
    timeline: [
      {
        status: 'FAILED',
        location: 'Peenya Hub',
        timestamp: '2026-10-17T10:20:00.000Z',
        description: 'Booking rejected by carrier: unserviceable pincode',
      },
    ],
  },
  {
    shipment_id: '10000000-0000-4000-8000-000000000008',
    reference_id: 'DEMO-008',
    carrier: 'delhivery',
    awb: 'DEMODL008',
    status: 'PICKUP_SCHEDULED',
    created_at: '2026-10-16T10:00:00.000Z',
    last_status_at: '2026-10-16T10:10:00.000Z',
    stuck: false,
    origin: {
      name: 'Delhi West Warehouse',
      phone: '9876543216',
      line1: 'Mayapuri Industrial Area',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'IN',
      pincode: '110064',
    },
    destination: {
      name: 'Rohit Gupta',
      phone: '9877889900',
      line1: '24 Janpath',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'IN',
      pincode: '110001',
    },
    weight_kg: 1.8,
    dimensions: { length_cm: 25, width_cm: 15, height_cm: 12 },
    items: [{ name: 'Running Shoes', quantity: 1, unit_price: 2999 }],
    payment_type: 'PREPAID',
    cod_amount: 0,
    total_amount_paise: 299900,
    timeline: [
      {
        status: 'PICKUP_SCHEDULED',
        location: 'Delhi West',
        timestamp: '2026-10-16T10:10:00.000Z',
        description: 'Pickup scheduled for tomorrow morning',
      },
    ],
  },
];

// In-memory store for newly created demo shipments
const store: OrderDetail[] = [...INITIAL_MOCK_ORDERS];

export const mockOrdersService: OrdersService = {
  async listOrders(query: OrderListQuery): Promise<DataResult<OrderListResult>> {
    const { status, carrier, from, search, page = 1, limit = 50 } = query;

    const filtered = store.filter((item) => {
      if (status && item.status !== status) return false;
      if (carrier && item.carrier !== carrier) return false;
      if (from && item.created_at.slice(0, 10) < from) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        const matchesAwb = item.awb.toLowerCase().includes(q);
        const matchesRef = item.reference_id.toLowerCase().includes(q);
        const matchesRecipient = item.destination.name.toLowerCase().includes(q);
        if (!matchesAwb && !matchesRef && !matchesRecipient) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || b.shipment_id.localeCompare(a.shipment_id),
    );

    const startIndex = (page - 1) * limit;
    const items: OrderSummary[] = sorted.slice(startIndex, startIndex + limit).map((d) => ({
      shipment_id: d.shipment_id,
      reference_id: d.reference_id,
      carrier: d.carrier,
      awb: d.awb,
      status: d.status,
      created_at: d.created_at,
      last_status_at: d.last_status_at,
      stuck: d.stuck,
    }));

    return fromMock({
      items,
      page,
      limit,
      total: sorted.length,
    });
  },

  async getOrderDetail(idOrAwb: string): Promise<DataResult<OrderDetail>> {
    const found = store.find((d) => d.shipment_id === idOrAwb || d.awb === idOrAwb);
    if (!found) {
      return {
        ok: false,
        source: 'mock',
        error: { kind: 'not_found', status: 404, message: `Shipment "${idOrAwb}" not found` },
      };
    }
    return fromMock(found);
  },

  async createShipment(input: CreateShipmentInput): Promise<DataResult<CreateShipmentResult>> {
    const idSuffix = String(store.length + 1).padStart(6, '0');
    const shipment_id = `10000000-0000-4000-8000-000000${idSuffix}`;
    const carrier = input.preferred_carrier || 'delhivery';
    const carrierCode = carrier.slice(0, 2).toUpperCase();
    const awb = `DEMO${carrierCode}${idSuffix}`;
    const now = new Date().toISOString();
    const reference_id = input.reference_id || `REF-${idSuffix}`;
    const status: NormalizedStatus = 'MANIFESTED';

    const itemsTotalPaise = input.items.reduce(
      (acc, item) => acc + Math.round(item.unit_price * 100) * item.quantity,
      0,
    );

    const newRecord: OrderDetail = {
      shipment_id,
      reference_id,
      carrier,
      awb,
      status,
      created_at: now,
      last_status_at: now,
      stuck: false,
      origin: { ...input.origin, country: input.origin.country || 'IN' },
      destination: { ...input.destination, country: input.destination.country || 'IN' },
      weight_kg: input.weight_kg,
      dimensions: input.dimensions,
      items: input.items,
      payment_type: input.payment_type,
      cod_amount: input.cod_amount ?? 0,
      total_amount_paise: itemsTotalPaise,
      timeline: [
        {
          status: 'MANIFESTED',
          location: input.origin.city,
          timestamp: now,
          description: 'Shipment created and manifested (Sample demo)',
        },
      ],
    };

    store.unshift(newRecord);

    return fromMock({
      shipment_id,
      reference_id,
      awb,
      carrier,
      status,
      created_at: now,
    });
  },
};
