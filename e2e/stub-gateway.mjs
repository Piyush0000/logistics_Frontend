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

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  if (req.url === '/health') return send(res, 200, { status: 'ok' });
  if (req.url === '/api/v1/shipments/stats') return send(res, 200, STATS);
  if (req.url === '/api/v1/shipments/LIVE123/tracking') return send(res, 200, TRACKING);
  return send(res, 404, { message: 'Not Found', statusCode: 404 });
}).listen(3103);
