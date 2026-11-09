// Stands in for the gateway in browser tests, using the response shapes from services/gateway.
import { createServer } from 'node:http';

const STATS = {
  PICKUP_SCHEDULED: 1,
  MANIFESTED: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  RTO_INITIATED: 6,
  RTO_DELIVERED: 7,
  CANCELLED: 0,
  FAILED: 0,
  stuck: 1,
};

const TRACKING = {
  shipment_id: '10000000-0000-4000-8000-000000000001',
  awb: 'LIVE123',
  carrier: 'ekart',
  status: 'DELIVERED',
  raw_status: 'Delivered',
  last_event_at: '2026-10-23T10:00:00.000Z',
  stuck: false,
  timeline: [
    {
      event_id: '1',
      status: 'DELIVERED',
      raw_status: 'Delivered',
      location: 'Jaipur',
      occurred_at: '2026-10-23T10:00:00.000Z',
      source: 'webhook',
    },
  ],
};

const WEBHOOKS_PATH = '/api/v1/webhooks';
const NOW = '2026-10-23T10:00:00.000Z';

const webhooks = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    url: 'https://hooks.example.com/live-orders',
    events: ['shipment.created'],
    status: 'ACTIVE',
    failure_started_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

const deliveries = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    event_id: '30000000-0000-4000-8000-000000000002',
    topic: 'shipment.failed',
    status: 'FAILED',
    target_url: 'https://hooks.example.com/live-orders',
    attempt_count: 3,
    next_attempt_at: null,
    created_at: NOW,
    subscription_status: 'ACTIVE',
    last_attempt: { started_at: NOW, http_status: 502, outcome: 'FAILED', error: 'Bad gateway' },
  },
];

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body ? JSON.parse(body) : undefined));
  });
}

async function handleWebhooks(req, res, path) {
  if (path === WEBHOOKS_PATH && req.method === 'GET') return send(res, 200, webhooks);

  if (path === WEBHOOKS_PATH && req.method === 'POST') {
    const body = await readBody(req);
    const webhook = {
      ...webhooks[0],
      ...body,
      id: `20000000-0000-4000-8000-${String(webhooks.length + 100).padStart(12, '0')}`,
    };
    webhooks.push(webhook);
    return send(res, 201, { ...webhook, secret: 'whsec_from_stub_gateway' });
  }

  if (path === `${WEBHOOKS_PATH}/deliveries`) {
    return send(res, 200, { items: deliveries, next_cursor: null });
  }

  const retry = path.match(/\/deliveries\/([^/]+)\/retry\/merchant$/);
  if (retry) {
    const delivery = deliveries.find(({ id }) => id === retry[1]);
    if (!delivery) return send(res, 404, { message: 'Delivery not found', statusCode: 404 });
    delivery.status = 'PENDING';
    return send(res, 202, { id: delivery.id, status: 'PENDING', manual_retry_requested: true });
  }

  const index = webhooks.findIndex(({ id }) => path === `${WEBHOOKS_PATH}/${id}`);
  if (index < 0) return send(res, 404, { message: 'Not Found', statusCode: 404 });

  if (req.method === 'PATCH') {
    Object.assign(webhooks[index], await readBody(req));
    return send(res, 200, webhooks[index]);
  }
  if (req.method === 'DELETE') {
    webhooks.splice(index, 1);
    res.writeHead(204);
    return res.end();
  }
  return send(res, 404, { message: 'Not Found', statusCode: 404 });
}

createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path.startsWith(WEBHOOKS_PATH)) return handleWebhooks(req, res, path);
  if (req.url === '/health') return send(res, 200, { status: 'ok' });
  if (req.url === '/api/v1/shipments/stats') return send(res, 200, STATS);
  if (req.url === '/api/v1/shipments/LIVE123/tracking') return send(res, 200, TRACKING);
  return send(res, 404, { message: 'Not Found', statusCode: 404 });
}).listen(3103);
