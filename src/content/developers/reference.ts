/**
 * The Evoc Ships API reference: every endpoint a merchant's API key can call for an integration,
 * with exact request and response shapes. Each entry is checked against the gateway
 * (services/gateway) and the services behind it; keep them in step when the API changes.
 */

export const API_BASE = 'https://ship.evoclabs.com/api/v1';

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Field {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export interface Endpoint {
  /** Anchor on the page, e.g. "create-shipment". */
  id: string;
  method: Method;
  /** Path after API_BASE, e.g. "/shipments/{awb}". */
  path: string;
  title: string;
  summary: string;
  /** Who in the merchant's team may call it; an API key may call everything. */
  roles?: string;
  pathParams?: Field[];
  query?: Field[];
  body?: Field[];
  /** Example JSON body. */
  example?: unknown;
  /** Example query string for GET examples, without the "?". */
  exampleQuery?: string;
  /** Value used for {awb} / {id} in examples. */
  exampleRef?: string;
  response: { status: number; example: unknown; note?: string };
  errors?: { status: number; when: string }[];
  notes?: string[];
}

export interface Section {
  slug: string;
  title: string;
  summary: string;
  intro: string[];
  endpoints: Endpoint[];
}

const EVS = 'EVS8516979039';
const SHIPMENT_ID = '3f6c1a52-8e1b-4c7d-9a2e-5b4f0c9d8e71';

const ADDRESS_FIELDS = (who: string): Field[] => [
  { name: `${who}.name`, type: 'string', required: true, description: 'Person or business, up to 120 characters.' },
  { name: `${who}.phone`, type: 'string', required: true, description: '10 to 15 digits, optional leading +.' },
  { name: `${who}.email`, type: 'string', description: 'Optional. Used for email updates to the buyer.' },
  { name: `${who}.line1`, type: 'string', required: true, description: 'Building, street, area. Up to 200 characters.' },
  { name: `${who}.line2`, type: 'string', description: 'Optional second line, up to 200 characters.' },
  { name: `${who}.city`, type: 'string', required: true, description: 'City.' },
  { name: `${who}.state`, type: 'string', required: true, description: 'State.' },
  { name: `${who}.country`, type: 'string', description: 'ISO country code. Defaults to IN.' },
  { name: `${who}.pincode`, type: 'string', required: true, description: '6 digits, not starting with 0.' },
];

const SHIPMENT = {
  id: SHIPMENT_ID,
  awb: EVS,
  reference_id: 'ORD-1042',
  status: 'IN_TRANSIT',
  carrier: 'delhivery',
  payment_type: 'COD',
  cod_amount_paise: 104700,
  weight_grams: 750,
  origin_pin: '560100',
  dest_pin: '400052',
  label_url: null,
  failure_reason: null,
  created_at: '2026-11-24T09:56:05.150Z',
  updated_at: '2026-11-24T14:10:00.000Z',
  last_status_at: '2026-11-24T14:10:00.000Z',
  stuck: false,
  cancel_requested: false,
  cancel_error: null,
  label_available: true,
};

const ADDRESS_FROM = {
  name: 'Asha Mart Warehouse',
  phone: '9876543210',
  line1: 'Plot 42, Electronic City Phase 1',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560100',
};
const ADDRESS_TO = {
  name: 'Ravi Kumar',
  phone: '9823456789',
  email: 'ravi@example.com',
  line1: 'Flat 12, Sunrise Apartments, Linking Road',
  line2: 'Near Khar station',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400052',
};

export const SECTIONS: Section[] = [
  {
    slug: 'shipments',
    title: 'Shipments',
    summary: 'Book, find, track, cancel and label shipments.',
    intro: [
      'Booking answers at once with your Evoc AWB (EVS followed by 10 digits) and books the courier in the background. Within seconds the shipment becomes CREATED, or FAILED with a reason; a webhook tells you which.',
      'Every route accepts the Evoc AWB or the shipment id wherever it says {awb}. The courier is chosen by your courier rules (Settings, Courier rules) unless you pass preferred_carrier.',
    ],
    endpoints: [
      {
        id: 'create-shipment',
        method: 'POST',
        path: '/shipments',
        title: 'Book a shipment',
        summary:
          'Books a real courier pickup and holds the shipping charge in your wallet. Send the same idempotency_key again and you get the same shipment back, never a second one.',
        roles: 'Admin, Operations',
        body: [
          { name: 'idempotency_key', type: 'string', required: true, description: '8 to 128 characters, unique per shipment. Reuse it only to retry the same shipment.' },
          { name: 'reference_id', type: 'string', description: 'Your order number, up to 64 characters. Shown on the label and in webhooks.' },
          ...ADDRESS_FIELDS('origin'),
          ...ADDRESS_FIELDS('destination'),
          { name: 'weight_kg', type: 'number', required: true, description: 'Dead weight in kg, above 0 and up to 1000.' },
          { name: 'dimensions.length_cm', type: 'number', required: true, description: 'Up to 500.' },
          { name: 'dimensions.width_cm', type: 'number', required: true, description: 'Up to 500.' },
          { name: 'dimensions.height_cm', type: 'number', required: true, description: 'Up to 500.' },
          { name: 'items[]', type: 'array', required: true, description: 'At least one item.' },
          { name: 'items[].name', type: 'string', required: true, description: 'Up to 200 characters.' },
          { name: 'items[].quantity', type: 'integer', required: true, description: '1 or more.' },
          { name: 'items[].unit_price', type: 'number', required: true, description: 'Price of one unit in rupees.' },
          { name: 'items[].sku', type: 'string', description: 'Optional, up to 64 characters.' },
          { name: 'items[].hsn_code', type: 'string', description: 'Optional, up to 16 characters.' },
          { name: 'payment_type', type: '"PREPAID" | "COD"', required: true, description: 'COD means the courier collects cod_amount from the buyer.' },
          { name: 'cod_amount', type: 'number', description: 'Rupees to collect. Above 0 for COD; 0 (the default) for PREPAID.' },
          { name: 'preferred_carrier', type: '"delhivery" | "shadowfax" | "ekart"', description: 'Optional hint. Your courier rules and serviceability have the final say.' },
        ],
        example: {
          idempotency_key: 'order-1042-v1',
          reference_id: 'ORD-1042',
          origin: ADDRESS_FROM,
          destination: ADDRESS_TO,
          weight_kg: 0.75,
          dimensions: { length_cm: 20, width_cm: 15, height_cm: 8 },
          items: [
            { name: 'Ceramic coffee mug, 350 ml', quantity: 2, unit_price: 399 },
            { name: 'Coaster set', quantity: 1, unit_price: 249 },
          ],
          payment_type: 'COD',
          cod_amount: 1047,
        },
        response: {
          status: 202,
          example: { shipment_id: SHIPMENT_ID, awb: EVS, carrier: 'delhivery', status: 'CREATE_REQUESTED', duplicate: false },
          note: 'duplicate is true when the idempotency_key was used before; the original shipment is returned.',
        },
        errors: [
          { status: 400, when: 'A field is missing or invalid. The body lists each problem under issues[].' },
          { status: 402, when: 'Your wallet does not cover the shipping charge (error INSUFFICIENT_BALANCE).' },
          { status: 403, when: 'Your account is not verified yet (KYC), so it cannot book.' },
        ],
        notes: [
          'Pickup happens at the warehouse registered with the courier for your account. Ask support to register a new pickup address before you book from it.',
        ],
      },
      {
        id: 'list-shipments',
        method: 'GET',
        path: '/shipments',
        title: 'List shipments',
        summary: 'Your shipments, newest first, with filters.',
        query: [
          { name: 'status', type: 'string', description: 'One status from the table on the overview page.' },
          { name: 'carrier', type: 'string', description: 'delhivery, shadowfax or ekart.' },
          { name: 'from', type: 'YYYY-MM-DD', description: 'Booked on or after this day.' },
          { name: 'to', type: 'YYYY-MM-DD', description: 'Booked on or before this day.' },
          { name: 'q', type: 'string', description: 'Search by AWB or your reference.' },
          { name: 'page', type: 'integer', description: 'From 1. Default 1.' },
          { name: 'limit', type: 'integer', description: 'Per page. Default 20.' },
        ],
        exampleQuery: 'status=IN_TRANSIT&page=1&limit=20',
        response: {
          status: 200,
          example: { shipments: [SHIPMENT], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 } },
        },
        errors: [{ status: 400, when: 'An unknown filter or a bad value.' }],
      },
      {
        id: 'get-shipment',
        method: 'GET',
        path: '/shipments/{awb}',
        title: 'Get a shipment',
        summary: 'One shipment, with the addresses and items you sent.',
        pathParams: [{ name: 'awb', type: 'string', required: true, description: 'Evoc AWB or shipment id.' }],
        exampleRef: EVS,
        response: {
          status: 200,
          example: {
            ...SHIPMENT,
            origin: ADDRESS_FROM,
            destination: ADDRESS_TO,
            weight_kg: 0.75,
            dimensions: { length_cm: 20, width_cm: 15, height_cm: 8 },
            items: [{ name: 'Ceramic coffee mug, 350 ml', quantity: 2, unit_price: 399 }],
            cod_amount: 1047,
          },
        },
        errors: [{ status: 404, when: 'No shipment of yours has that AWB.' }],
      },
      {
        id: 'track-shipment',
        method: 'GET',
        path: '/shipments/{awb}/tracking',
        title: 'Track a shipment',
        summary: 'Current status and every scan so far, oldest first.',
        pathParams: [{ name: 'awb', type: 'string', required: true, description: 'Evoc AWB or shipment id.' }],
        exampleRef: EVS,
        response: {
          status: 200,
          example: {
            shipment_id: SHIPMENT_ID,
            awb: EVS,
            carrier: 'delhivery',
            status: 'IN_TRANSIT',
            last_event_at: '2026-11-24T14:10:00.000Z',
            stuck: false,
            timeline: [
              { status: 'MANIFESTED', location: null, occurred_at: '2026-11-24T09:56:05.150Z' },
              { status: 'IN_TRANSIT', location: 'Bengaluru Hub', occurred_at: '2026-11-24T14:10:00.000Z' },
            ],
          },
          note: 'stuck is true when a shipment has had no scan for longer than usual.',
        },
      },
      {
        id: 'cancel-shipment',
        method: 'POST',
        path: '/shipments/{awb}/cancel',
        title: 'Cancel a shipment',
        summary:
          'Asks the courier to cancel before pickup. The courier confirms within moments; the held charge then returns to your wallet.',
        roles: 'Admin, Operations',
        pathParams: [{ name: 'awb', type: 'string', required: true, description: 'Evoc AWB or shipment id.' }],
        body: [{ name: 'reason', type: 'string', description: 'Optional, up to 200 characters.' }],
        example: { reason: 'Customer cancelled the order' },
        exampleRef: EVS,
        response: { status: 202, example: { shipment_id: SHIPMENT_ID, awb: EVS, status: 'CANCEL_REQUESTED' } },
        errors: [{ status: 409, when: 'Already picked up, delivered or cancelled.' }],
      },
      {
        id: 'label-data',
        method: 'GET',
        path: '/shipments/{awb}/label-data',
        title: 'Label data',
        summary:
          'Everything printed on the Evoc Labs Pvt Ltd shipping label, to print it in your own system. Print courier_awb as a Code 128 barcode: the courier scans it at pickup and at every hub.',
        pathParams: [{ name: 'awb', type: 'string', required: true, description: 'Evoc AWB or shipment id.' }],
        exampleRef: EVS,
        response: {
          status: 200,
          example: {
            awb: EVS,
            carrier_awb: '71705910000055',
            invoice_number: 'EVL/26-27/8516979039',
            invoice_date: '2026-11-24T09:56:05.150Z',
            reference_id: 'ORD-1042',
            merchant_name: 'Asha Mart',
            origin: ADDRESS_FROM,
            destination: ADDRESS_TO,
            weight_kg: 0.75,
            dimensions: { length_cm: 20, width_cm: 15, height_cm: 8 },
            items: [{ name: 'Ceramic coffee mug, 350 ml', quantity: 2, unit_price: 399 }],
            payment_type: 'COD',
            cod_amount: 1047,
          },
        },
        errors: [{ status: 409, when: 'The courier has not booked it yet, or it was cancelled.' }],
      },
    ],
  },
  {
    slug: 'rates',
    title: 'Rates',
    summary: 'Prices and serviceability before you book.',
    intro: [
      'A quote uses the same rate cards, discounts and courier limits as booking, so the total you see is what booking holds in your wallet.',
    ],
    endpoints: [
      {
        id: 'quote',
        method: 'POST',
        path: '/rates/quote',
        title: 'Get a quote',
        summary: 'Each courier: whether it serves the route, how long it takes, and the price.',
        body: [
          { name: 'origin_pincode', type: 'string', required: true, description: '6-digit pickup pincode.' },
          { name: 'destination_pincode', type: 'string', required: true, description: '6-digit delivery pincode.' },
          { name: 'weight_kg', type: 'number', required: true, description: 'Above 0 and up to 100.' },
          { name: 'payment_type', type: '"PREPAID" | "COD"', required: true, description: 'COD adds the COD fee.' },
          { name: 'cod_amount_paise', type: 'integer', description: 'Required for COD: the amount to collect, in paise.' },
        ],
        example: { origin_pincode: '560100', destination_pincode: '400052', weight_kg: 0.75, payment_type: 'COD', cod_amount_paise: 104700 },
        response: {
          status: 200,
          example: {
            items: [
              {
                carrier: 'delhivery',
                serviceable: true,
                reason: null,
                cod_available: true,
                estimated_days: 3,
                zone: 'C',
                chargeable_weight_kg: 1,
                freight_paise: 6800,
                cod_fee_paise: 3000,
                total_paise: 9800,
              },
            ],
          },
          note: 'A courier that cannot take the parcel has serviceable false, a reason, and null prices.',
        },
      },
    ],
  },
  {
    slug: 'pickups',
    title: 'Pickups',
    summary: 'Ask the courier to collect booked shipments.',
    intro: [
      'A pickup groups shipments of one courier for one day. Pass Evoc AWBs; a shipment can be in only one open pickup. The courier comes to one of your saved pickup addresses (Settings, Pickup addresses).',
    ],
    endpoints: [
      {
        id: 'pickup-addresses',
        method: 'GET',
        path: '/account/pickup-addresses',
        title: 'List pickup addresses',
        summary: 'Your saved pickup addresses, the default first. Use an id to schedule a pickup.',
        response: {
          status: 200,
          example: {
            items: [
              {
                id: '7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
                label: 'Main warehouse',
                address: ADDRESS_FROM,
                is_default: true,
              },
            ],
          },
        },
      },
      {
        id: 'create-pickup',
        method: 'POST',
        path: '/pickups',
        title: 'Schedule a pickup',
        roles: 'Admin, Operations',
        summary: 'Sends the pickup request to the courier; it moves to SCHEDULED or FAILED with the reason.',
        body: [
          { name: 'pickup_date', type: 'YYYY-MM-DD', required: true, description: 'The day to collect.' },
          { name: 'window.start', type: 'HH:MM', description: 'Optional time window start.' },
          { name: 'window.end', type: 'HH:MM', description: 'Optional time window end.' },
          { name: 'awbs[]', type: 'string[]', required: true, description: 'Evoc AWBs of booked shipments, all with the same courier.' },
          { name: 'pickup_address_id', type: 'uuid', required: true, description: 'One of your saved pickup addresses (List pickup addresses).' },
        ],
        example: {
          pickup_date: '2026-11-25',
          window: { start: '10:00', end: '14:00' },
          awbs: [EVS],
          pickup_address_id: '7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
        },
        response: {
          status: 201,
          example: {
            id: '6a2b9c4d-1e3f-4a5b-8c7d-9e0f1a2b3c4d',
            carrier: 'delhivery',
            pickup_date: '2026-11-25',
            window: { start: '10:00', end: '14:00' },
            address_label: 'Main warehouse',
            awbs: [EVS],
            status: 'REQUESTED',
            carrier_pickup_id: null,
            error: null,
            created_at: '2026-11-24T15:00:00.000Z',
          },
        },
        errors: [
          { status: 400, when: 'Unknown AWBs, mixed couriers, a date outside the allowed days, or an unknown pickup address.' },
          { status: 409, when: 'A shipment is already in an open pickup.' },
        ],
      },
      {
        id: 'list-pickups',
        method: 'GET',
        path: '/pickups',
        title: 'List pickups',
        summary: 'Your pickups, newest first.',
        query: [
          { name: 'page', type: 'integer', description: 'From 1.' },
          { name: 'limit', type: 'integer', description: 'Per page.' },
        ],
        response: { status: 200, example: { items: ['…pickup objects…'], page: 1, limit: 20, total: 1 } },
      },
      {
        id: 'get-pickup',
        method: 'GET',
        path: '/pickups/{id}',
        title: 'Get a pickup',
        summary: 'One pickup and its status.',
        pathParams: [{ name: 'id', type: 'uuid', required: true, description: 'The pickup id.' }],
        exampleRef: '6a2b9c4d-1e3f-4a5b-8c7d-9e0f1a2b3c4d',
        response: { status: 200, example: '…the pickup object, as above…' },
      },
    ],
  },
  {
    slug: 'ndr',
    title: 'Failed deliveries (NDR)',
    summary: 'Decide what happens after a failed delivery attempt.',
    intro: [
      'When the courier cannot deliver (buyer not available, address problem and so on), the shipment gets an NDR with status ACTION_REQUIRED. Ask for another attempt, or return it to you (RTO). The courier confirms; if it refuses, the NDR goes back to ACTION_REQUIRED with action_error saying why.',
    ],
    endpoints: [
      {
        id: 'list-ndr',
        method: 'GET',
        path: '/ndr',
        title: 'List NDRs',
        summary: 'Your NDRs, those needing a decision first.',
        response: {
          status: 200,
          example: {
            items: [
              {
                id: '0c9e8d7f-6a5b-4c3d-2e1f-0a9b8c7d6e5f',
                shipment_id: SHIPMENT_ID,
                awb: EVS,
                evoc_awb: EVS,
                carrier: 'delhivery',
                status: 'ACTION_REQUIRED',
                attempt_count: 1,
                last_reason: 'Customer not available',
                last_attempt_at: '2026-11-26T11:20:00.000Z',
                action_error: null,
                history: [{ kind: 'ATTEMPT_FAILED', note: 'Customer not available', at: '2026-11-26T11:20:00.000Z' }],
                reference_id: 'ORD-1042',
                recipient_name: 'Ravi Kumar',
                recipient_phone: '9823456789',
                destination_city: 'Mumbai',
              },
            ],
          },
          note: 'status is ACTION_REQUIRED, REATTEMPT_REQUESTED, RTO_REQUESTED, DELIVERED or RETURNED.',
        },
      },
      {
        id: 'ndr-action',
        method: 'POST',
        path: '/ndr/{id}/action',
        title: 'Decide an NDR',
        summary: 'Re-attempt delivery, or return to origin.',
        roles: 'Admin, Operations',
        pathParams: [{ name: 'id', type: 'uuid', required: true, description: 'The NDR id.' }],
        body: [
          { name: 'action', type: '"REATTEMPT" | "RTO"', required: true, description: 'What to do.' },
          { name: 'preferred_date', type: 'YYYY-MM-DD', description: 'REATTEMPT only: within the next 7 days.' },
          { name: 'instructions', type: 'string', description: 'For the courier, up to 200 characters.' },
        ],
        example: { action: 'REATTEMPT', preferred_date: '2026-11-27', instructions: 'Call before arriving' },
        exampleRef: '0c9e8d7f-6a5b-4c3d-2e1f-0a9b8c7d6e5f',
        response: { status: 200, example: '…the NDR, now REATTEMPT_REQUESTED…' },
        errors: [{ status: 409, when: 'The NDR does not need a decision now.' }],
      },
    ],
  },
  {
    slug: 'money',
    title: 'Wallet, COD and statements',
    summary: 'Balance, wallet lines, COD remittance, weight charges and monthly statements.',
    intro: [
      'Money is always in paise (1 rupee = 100 paise) as integers. Shipping charges are held from the wallet at booking and taken when the courier picks up; cancelling before pickup releases them.',
    ],
    endpoints: [
      {
        id: 'wallet',
        method: 'GET',
        path: '/wallet',
        title: 'Wallet balance',
        summary: 'What you can spend, what is held for booked shipments, and COD not yet paid to you.',
        response: { status: 200, example: { available: 1250000, reserved: 9800, pendingCod: 104700 } },
      },
      {
        id: 'wallet-transactions',
        method: 'GET',
        path: '/wallet/transactions',
        title: 'Wallet lines',
        summary: 'Every credit and debit, newest first.',
        roles: 'Admin, Finance',
        query: [
          { name: 'direction', type: '"credit" | "debit"', description: 'Only one kind.' },
          { name: 'from', type: 'YYYY-MM-DD', description: 'On or after.' },
          { name: 'to', type: 'YYYY-MM-DD', description: 'On or before.' },
          { name: 'page', type: 'integer', description: 'From 1.' },
          { name: 'limit', type: 'integer', description: 'Per page.' },
        ],
        exampleQuery: 'direction=debit&page=1&limit=20',
        response: {
          status: 200,
          example: {
            items: [{ id: 'a1b2c3d4-…', at: '2026-11-24T10:30:00.000Z', direction: 'debit', amount_paise: 9800, reason: 'Settle manifested shipment charge' }],
            page: 1,
            limit: 20,
            total: 1,
          },
        },
      },
      {
        id: 'cod-summary',
        method: 'GET',
        path: '/cod/summary',
        title: 'COD summary',
        summary: 'COD paid into your wallet so far, and what is due next.',
        roles: 'Admin, Finance',
        response: {
          status: 200,
          example: {
            remitted_till_date_paise: 4820000,
            settled_count: 51,
            last_remittance_paise: 612000,
            next_batch_paise: 209400,
            next_batch_count: 2,
            total_due_paise: 209400,
            due_count: 2,
          },
        },
      },
      {
        id: 'cod-remittances',
        method: 'GET',
        path: '/cod/remittances',
        title: 'COD lines',
        summary: 'Each delivered COD order: pending, or paid into your wallet.',
        roles: 'Admin, Finance',
        query: [
          { name: 'status', type: '"pending" | "settled"', description: 'Only one kind.' },
          { name: 'from', type: 'YYYY-MM-DD', description: 'Delivered on or after.' },
          { name: 'to', type: 'YYYY-MM-DD', description: 'Delivered on or before.' },
          { name: 'page', type: 'integer', description: 'From 1.' },
          { name: 'limit', type: 'integer', description: 'Per page.' },
        ],
        exampleQuery: 'status=settled',
        response: {
          status: 200,
          example: {
            items: [
              {
                id: 'c0d1e2f3-…',
                awb: EVS,
                evoc_awb: EVS,
                reference_id: 'ORD-1042',
                shipment_id: SHIPMENT_ID,
                carrier: 'delhivery',
                expected_paise: 104700,
                settled_paise: 104700,
                settled_at: '2026-12-07T12:00:00.000Z',
                delivered_at: '2026-11-27T16:40:00.000Z',
              },
            ],
            page: 1,
            limit: 20,
            total: 1,
          },
        },
      },
      {
        id: 'weight-list',
        method: 'GET',
        path: '/weight/discrepancies',
        title: 'Weight charges',
        summary:
          'Shipments the courier charged as heavier than you declared. Answer within 7 days: no answer counts as accepting.',
        query: [
          { name: 'status', type: '"open" | "disputed" | "accepted" | "resolved"', description: 'Only one status.' },
          { name: 'q', type: 'string', description: 'Part of an AWB.' },
          { name: 'page', type: 'integer', description: 'From 1.' },
        ],
        exampleQuery: 'status=open',
        response: {
          status: 200,
          example: {
            items: [
              {
                id: '5e4d3c2b-…',
                awb: EVS,
                carrier: 'delhivery',
                declared_grams: 750,
                charged_grams: 1500,
                extra_charge_paise: 4500,
                status: 'open',
                outcome: null,
                raised_at: '2026-11-30T05:00:00.000Z',
                respond_by: '2026-12-07',
              },
            ],
            page: 1,
            limit: 10,
            total: 1,
          },
        },
      },
      {
        id: 'weight-accept',
        method: 'POST',
        path: '/weight/discrepancies/{id}/accept',
        title: 'Accept a weight charge',
        summary: 'Takes the extra charge from your wallet now.',
        roles: 'Admin, Finance',
        pathParams: [{ name: 'id', type: 'uuid', required: true, description: 'The weight charge id.' }],
        exampleRef: '5e4d3c2b-…',
        response: { status: 200, example: '…the weight charge, now accepted…' },
        errors: [{ status: 409, when: 'Already settled.' }],
      },
      {
        id: 'weight-dispute',
        method: 'POST',
        path: '/weight/discrepancies/{id}/dispute',
        title: 'Dispute a weight charge',
        summary: 'Our team reviews it with the courier and decides; you are charged only if the courier is right.',
        roles: 'Admin, Finance, Operations',
        pathParams: [{ name: 'id', type: 'uuid', required: true, description: 'The weight charge id.' }],
        body: [
          { name: 'note', type: 'string', required: true, description: 'Why it is wrong, 10 to 1000 characters.' },
          { name: 'evidence[]', type: 'array', description: 'Up to 5 files described by name, type and size. Email the files themselves to support.' },
        ],
        example: {
          note: 'Packed at 740 g; photo of the parcel on the scale attached.',
          evidence: [{ name: 'scale.jpg', type: 'image/jpeg', size: 120000 }],
        },
        exampleRef: '5e4d3c2b-…',
        response: { status: 200, example: '…the weight charge, now disputed…' },
        errors: [{ status: 409, when: 'Not open, or the 7 days have passed.' }],
      },
      {
        id: 'statements',
        method: 'GET',
        path: '/statements',
        title: 'Monthly statements',
        summary: 'One statement per month with charges: shipping and COD fees, with 18% GST shown separately.',
        roles: 'Admin, Finance',
        response: {
          status: 200,
          example: {
            items: [
              {
                id: '2026-11',
                number: 'EVS/2026-27/6FC4D4/202611',
                period_start: '2026-11-01',
                period_end: '2026-11-30',
                shipments: 182,
                freight_paise: 1452000,
                cod_fees_paise: 210000,
                taxable_paise: 1408475,
                gst_paise: 253525,
                total_paise: 1662000,
                status: 'paid',
                issued_at: '2026-12-01T00:00:00.000Z',
              },
            ],
          },
        },
      },
    ],
  },
];

/** The shipment statuses, in the order a shipment moves through them. */
export const STATUSES: { status: string; meaning: string }[] = [
  { status: 'CREATE_REQUESTED', meaning: 'Accepted by us; the courier is being booked.' },
  { status: 'CREATED', meaning: 'The courier accepted the booking.' },
  { status: 'MANIFESTED', meaning: 'Handed over to the courier; the shipping charge is taken.' },
  { status: 'PICKUP_SCHEDULED', meaning: 'The courier is due to collect it.' },
  { status: 'IN_TRANSIT', meaning: 'Moving between courier hubs.' },
  { status: 'OUT_FOR_DELIVERY', meaning: 'With the delivery agent today.' },
  { status: 'DELIVERED', meaning: 'Delivered to the buyer. Final.' },
  { status: 'RTO_INITIATED', meaning: 'Coming back to you after failed delivery.' },
  { status: 'RTO_DELIVERED', meaning: 'Returned to you. Final.' },
  { status: 'CANCELLED', meaning: 'Cancelled before pickup; the held charge is released. Final.' },
  { status: 'FAILED', meaning: 'The courier refused the booking; failure_reason says why. Final.' },
];

/** HTTP status codes the API answers with. */
export const ERRORS: { status: string; meaning: string }[] = [
  { status: '400', meaning: 'Something in the request is wrong. Read message, or issues[] for each field.' },
  { status: '401', meaning: 'Missing, wrong or revoked API key.' },
  { status: '402', meaning: 'Not enough money in your wallet (INSUFFICIENT_BALANCE).' },
  { status: '403', meaning: 'Your account or role may not do this (for example, booking before KYC is verified).' },
  { status: '404', meaning: 'Not found, or it belongs to another account.' },
  { status: '409', meaning: 'Not possible in its current state (already cancelled, already decided and so on).' },
  { status: '429', meaning: 'Too many requests. Wait a moment and try again.' },
  { status: '5xx', meaning: 'A problem on our side or the courier’s. Safe to retry with the same idempotency_key.' },
];

export function sectionBySlug(slug: string) {
  return SECTIONS.find((s) => s.slug === slug) ?? null;
}

/** The example path with {awb} / {id} filled in. */
export function examplePath(endpoint: Endpoint): string {
  const path = endpoint.exampleRef ? endpoint.path.replace(/\{[^}]+\}/, endpoint.exampleRef) : endpoint.path;
  return endpoint.exampleQuery ? `${path}?${endpoint.exampleQuery}` : path;
}

/** Code samples for one endpoint. */
export function codeSamples(endpoint: Endpoint): { language: string; label: string; code: string }[] {
  const url = `${API_BASE}${examplePath(endpoint)}`;
  const body = endpoint.example === undefined ? null : JSON.stringify(endpoint.example, null, 2);
  const curl = [
    `curl -X ${endpoint.method} '${url}' \\`,
    // Double quotes, so the shell puts the key in place of $EVOC_API_KEY.
    `  -H "Authorization: Bearer $EVOC_API_KEY"${body ? ' \\' : ''}`,
    ...(body ? [`  -H 'Content-Type: application/json' \\`, `  -d '${body.replace(/'/g, "'\\''")}'`] : []),
  ].join('\n');
  const js = [
    `const res = await fetch('${url}', {`,
    `  method: '${endpoint.method}',`,
    `  headers: {`,
    `    Authorization: \`Bearer \${process.env.EVOC_API_KEY}\`,`,
    ...(body ? [`    'Content-Type': 'application/json',`] : []),
    `  },`,
    ...(body ? [`  body: JSON.stringify(${body.replace(/\n/g, '\n  ')}),`] : []),
    `});`,
    `const data = await res.json();`,
  ].join('\n');
  const py = [
    'import os, requests',
    '',
    `res = requests.${endpoint.method.toLowerCase()}(`,
    `    "${url}",`,
    `    headers={"Authorization": f"Bearer {os.environ['EVOC_API_KEY']}"},`,
    ...(body
      ? [
          `    json=${body
            .replace(/\bnull\b/g, 'None')
            .replace(/\btrue\b/g, 'True')
            .replace(/\bfalse\b/g, 'False')
            .replace(/\n/g, '\n    ')},`,
        ]
      : []),
    '    timeout=30,',
    ')',
    'data = res.json()',
  ].join('\n');
  return [
    { language: 'bash', label: 'curl', code: curl },
    { language: 'javascript', label: 'Node.js', code: js },
    { language: 'python', label: 'Python', code: py },
  ];
}
