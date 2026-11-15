# Frontend ↔ backend: what blocks the live connection

For the Evoc Ships backend team. Every item was checked against the backend code (`Evoc_ships` at `aace603`). The frontend changes no backend code.

The frontend only talks to the gateway (`services/gateway`, port 8080). Three areas connect today: tracking, webhooks, and the shipment list and counts. The list and counts only work in demo mode (`DASHBOARD_MOCK_MODE=true`). Everything else shows labelled sample data, because the gateway has no route for it.

## 1. Login and merchant auth: missing everywhere

- No service has a login, sign-up, session or merchant route, so the frontend cannot sign real users in.
- **Needed:** an auth endpoint that issues a merchant token, plus one agreed token format that the gateway accepts on every merchant route.
- Today there are two different schemes:
  - **Shipments** accept any Bearer token. In demo mode they accept only `demo-merchant-001` / `-002`.
  - **Webhooks** need a token of at least 32 characters, whose sha256 is listed in `WEBHOOK_MERCHANT_KEYS` (`webhooks/.../merchant-key.guard.ts`).
- **Frontend side: ready, nothing to fix.** The two cookies are kept apart on purpose.
  - `evoc_demo_session` holds only the demo email and is never sent to the gateway.
  - `evoc_session` is reserved for the token a real login will issue. `src/lib/auth/credentials.ts` already reads it first, with separate `shipments` and `webhooks` tokens.
  - Until the backend issues a token, production sends no gateway credential.

## 2. Booking a shipment always fails

- `POST /api/v1/shipments` returns 503 in every environment (`gateway/src/shipments/shipments.controller.ts`, `create()`).
- **Needed:** open it once auth exists, with the gateway injecting `merchant_id`. Without one, order-engine falls back to `'default_merchant'` (`order-engine/src/shipments/shipments.service.ts`).

## 3. The shipment list and counts don't work outside demo mode

**a. 503 by default.** The gateway's `.env.example` sets `DASHBOARD_MOCK_MODE=false` and has no `SHIPMENT_READ_URL`, so `/api/v1/shipments` and `/stats` return 503.

**b. Auth mismatch.** The gateway forwards the merchant's Bearer token unchanged, so order-engine answers 401. Its `OrderEngineInternalGuard` expects `Bearer ORDER_ENGINE_INTERNAL_API_KEY` plus an `x-merchant-id` header.
- **Needed:** the gateway maps the merchant token to a merchant id, then calls order-engine with the internal key and that id.
- Without a merchant id, order-engine's stats count every merchant.

**c. Response shapes differ.** Order-engine returns `{ shipments, pagination: { page, limit, total, total_pages } }`, with a nullable `awb` and `reference_id`, and no `last_status_at` or `stuck`. The gateway's demo mode returns `{ items, page, limit, total }`.
- **Frontend side: done.** It now accepts both shapes, so either works:
  - `last_status_at` falls back to `updated_at`;
  - a missing `stuck` reads as false;
  - a null AWB shows "Not assigned".
- **Still useful:** confirm which shape is final.

**d. Stats.** Order-engine's stats have no `stuck` count and can include `CREATE_REQUESTED`. The frontend counts `CREATE_REQUESTED` under "To be processed".

**e. Filters.** The gateway allows only `status, carrier, from, page, limit` and returns 400 for anything else.
- **Please allow `to`.** Order-engine already supports it.
- **Please add server-side search by AWB or reference.** Until then the frontend can only search one gateway page. It says so on screen, shows how many matches that page has, and pages through the gateway's pages.

## 4. Routes that exist in a service but not in the gateway

| Feature | Service route | Notes |
|---|---|---|
| Shipment details | order-engine `GET /v1/shipments/:id` | Please add `GET /api/v1/shipments/:id`. The detail page uses sample data until then |
| Wallet balance | ledger-engine `GET /v1/wallet` | Needs `LEDGER_INTERNAL_API_KEY` and `x-merchant-id` |
| COD remittances | reconciliation `remittances`, `summary`, `overdue`, `exceptions`, … | See the reconciliation problems below |
| Stuck shipments | tracking-engine `GET /v1/shipments/stuck` and `/stuck/stats` | |

Reconciliation has three problems:
- it is missing from `gateway/src/upstreams.ts`;
- its routes have no guards;
- it defaults to port **3004**, the same port as webhooks (`reconciliation/src/main.ts`, `webhooks/src/main.ts`).

## 5. Tracking works, but

- tracking-engine `GET /v1/shipments/:id/tracking` has no auth or merchant check, so anyone can read any AWB. The public tracking page relies on this.
  - Please decide on a deliberately public endpoint that returns only the status and events, plus a merchant endpoint scoped to that merchant's shipments.
- Demo mode doesn't cover tracking, so the demo AWBs return 404. Seed data or demo coverage is needed.

## 6. Webhooks work, given this setup

- A dev merchant key of 32 or more characters, registered in `WEBHOOK_MERCHANT_KEYS`.
- Retry returns 503 unless `WEBHOOK_DELIVERY_ENABLED=true`.

## 7. No backend route at all (the frontend shows sample data)

- **Shipping work:** NDR, pickups and manifests, pickup addresses, rates and the rate card, weight discrepancies.
- **Money:** invoices, revenue and analytics, COD payouts (apart from the reconciliation routes above).
- **Account and settings:** company and KYC, team and users, notifications, courier rules, sub-merchants, tracking-page branding.
- **Support and messaging:** support tickets, SMS and messages, channel integrations.

## Small item

The gateway README does not list the tracking or carrier-webhook routes.
