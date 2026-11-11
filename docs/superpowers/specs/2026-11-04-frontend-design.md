# Evoc Logistics frontend design

**Date:** 2026-11-04
**Status:** Approved 2026-11-04. Built in full on branch `feature/full-frontend` (Tasks 1 to 37); the "Built in" column of the navigation map below names the task that delivered each screen, and every entry is `live`
**Backend baseline:** `Evoc_ships` at commit `aace6033`, clean working tree

## 1. Goal

Build the merchant-facing web frontend for the Evoc logistics platform in `logistics_Frontend`, connected to the existing backend in `Evoc_ships`.

Success means:
- Each UI matches its assigned reference and design file, and is approved by the project owner before the next one starts.
- Screens use real gateway data wherever a route exists, and any other data is visibly labelled as sample data.
- A mock can be replaced by a real route without changing the screen that uses it.
- `Evoc_ships` has no code changes.

## 2. Constraints

- All frontend code lives in `logistics_Frontend`. `Evoc_ships` is read-only.
- UIs are built one at a time. The owner names the reference and design file for each.
- The Sharkship palette applies to every screen.
- The final product name and logo will be supplied by the owner. A marked placeholder is used until then. Logos, names, figures and user names in reference images are not copied.
- Nothing is committed unless the owner asks.

## 3. Architecture

Next.js with TypeScript. Server code calls the gateway, and the browser never does.

```
Browser
  -> Next.js (Server Components, Server Actions, route handlers for polling)
       -> src/lib/data/<feature>     per-feature interface
            -> gateway.ts            -> gateway client -> http://localhost:8080
            -> mock.ts               -> local sample data
```

This keeps merchant keys off the browser and avoids CORS, since the gateway allows only `http://localhost:3000` by default and does not enable credentialed requests. `apps/dashboard` uses the same server-side approach.

### Project layout

| Path | Purpose |
|---|---|
| `src/app/(auth)/` | Login, using the Mera Courier Wala theme tokens |
| `src/app/(app)/` | Signed-in screens, using the Sharkship theme tokens |
| `src/lib/gateway/client.ts` | `server-only` fetch wrapper with timeout and typed result |
| `src/lib/gateway/schemas/` | Zod response schemas, because contracts has no HTTP response types |
| `src/lib/data/<feature>/` | `index.ts` (interface and selection), `gateway.ts`, `mock.ts` |
| `src/lib/auth/credentials.ts` | `server-only`: session cookie, then dev keys outside production |
| `src/lib/format/` | Money, dates and status labels |
| `vendor/` | Packed `@logicore/contracts` tarball |

Pages import from `src/lib/data` only, never from the gateway client. Features are added when their screen is built.

### Data results and errors

- Every data result carries `source: 'gateway' | 'mock'`. The UI shows a "Sample data" badge when the source is `mock`.
- `DATA_SOURCE_<FEATURE>=gateway|mock` switches a feature.
- The gateway client returns a typed result and does not throw for HTTP failures. It maps every backend error format to one `ApiError`:

| Backend body | Comes from |
|---|---|
| `{message, error?, statusCode}` | Nest exceptions |
| `{error:'VALIDATION_FAILED', issues:[{path,message}]}` | Zod pipes |
| `{error:'UPSTREAM_UNAVAILABLE', service}` with HTTP 502 | Gateway proxy failure |
| Non-JSON body, timeout or network failure | Anything else |

### Environment

`GATEWAY_URL` (default `http://localhost:8080`), `DEV_SHIPMENTS_TOKEN`, `DEV_WEBHOOK_TOKEN`, and `DATA_SOURCE_<FEATURE>`, documented in `.env.example`. Dev tokens are never prefixed `NEXT_PUBLIC_`.

### Contracts

`@logicore/contracts` is private and not published. It is packed into `vendor/` with `npm pack --pack-destination`, depended on via `file:`, and refreshed with a `contracts:update` script. Zod stays on 3.x to match. `@logicore/adapter-sdk` and `@logicore/shared` are server-only Kafka and Node code and are not used.

## 4. Design system

### Colour tokens (all screens)

| Token | Value | Use |
|---|---|---|
| `primary` | `#184FA2` | Brand panels, primary buttons, links |
| `secondary` | `#E5E5E5` | Borders and dividers |
| `tertiary` | `#FAFAFA` | Button text, light page surfaces |
| `neutral` / `surface` | `#FFFFFF` | Page and card backgrounds |
| `on-surface` | `#0A0A0A` | Main text |
| `muted` | `#184FA21A` | Tints, chip backgrounds |
| `accent` | `#2EA8E6` | Fills and icons only |
| `success` | `#22C55E` | Positive states |
| `warning` | `#F59E0B` | Attention states, as a tint with `on-surface` text |
| `error` | `#EF4444` | Failures |

### Per-screen tokens

Everything other than colour comes from the file assigned to the screen.

| | Login (`meracourierwala.com-design.md`) | Dashboard (`sharkship.in-design.md`) |
|---|---|---|
| Fonts | Manrope | Inter, IBM Plex Sans, Manrope |
| Heading weight | 800 (the file's 900 and 950 exceed Manrope's maximum) | 700 display, 400 section headings |
| Control radius | 14px | 8px |
| Card radius | 26px | 16px |
| Button height | 48px | 32px |
| Card padding | 16px | 24px, or 16px on phones |

Both groups work at phone and desktop widths. Dashboard buttons are 32px on desktop with a mouse, and 44px on touch devices so they are comfortable to tap.

### Conflicts between references and the palette

- The Mera Courier Wala file describes a dark theme, but the login image is light. The login follows the image.
- Orange in the login image becomes `primary` text, and the badge uses the Sharkship chip style.
- The orange dashboard ticker becomes a `warning` tint with `on-surface` text.
- Dashboard KPI cards use `primary`, `success`, `warning` and `accent` tints. Purple is not in the palette.

## 5. Delivery stages

Each stage: short design note, owner approval, build that UI only, screenshots at desktop and phone width, update `Readme.md` and `updatesDoc.md`, owner review, then sign-off.

`Readme.md` describes how the project works and only documents commands that have been run. `updatesDoc.md` records what has been done, newest first, with verification results and anything pending.

| Stage | Scope |
|---|---|
| 0 | Foundation: scaffold, tokens, gateway client, data pattern, contracts. No product screens |
| 1 | Login, from image 1. Mock only |
| 2 | Main dashboard shell and Overview tab, from image 2 |
| Later | Only as the owner directs, with a reference and design file for each |

## 6. Backend reference

Everything below is reached through the gateway at port 8080. Findings come from reading the source at the baseline commit, and services were not run.

### Routes

| Route | Auth | State |
|---|---|---|
| `GET /health` | None | Live |
| `GET /health/upstream`, `GET /api/v1/events/recent` | None | Dev only, 404 in production |
| `GET /api/v1/shipments`, `GET /api/v1/shipments/stats` | Bearer | Mock only: needs `DASHBOARD_MOCK_MODE=true` and `demo-merchant-001` or `-002` |
| `POST /api/v1/shipments` | n/a | Always 503 |
| `GET /api/v1/shipments/:id/tracking` | None effective | Live, needs tracking-engine. Not merchant-scoped |
| `/api/v1/webhooks` (POST, GET), `/:id` (PATCH, DELETE) | Merchant key, 32+ chars | Live, needs the webhooks service and Postgres |
| `GET /api/v1/webhooks/deliveries`, `POST .../deliveries/:id/retry/merchant` | Merchant key | Live; history likely empty because the event consumer is off by default |
| `/api/v1/webhooks/deliveries/support*` | Support key | Out of scope for a merchant UI |

List query: `status`, `carrier`, `from` (YYYY-MM-DD), `page`, `limit` (1 to 100, default 50). Other keys return 400.

Not available through the gateway: login, shipment detail, wallet, COD reconciliation, rate quotes, serviceability, cancel, pickups.

### Data rules

- Statuses: `PICKUP_SCHEDULED`, `MANIFESTED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `RTO_INITIATED`, `RTO_DELIVERED`, `CANCELLED`, `FAILED`. The orders table also holds `CREATE_REQUESTED` and `CREATED`.
- There is no NDR status. Failed delivery attempts appear as `OUT_FOR_DELIVERY`, so `raw_status` is shown beside the normalized status.
- `DELIVERED` can follow `RTO_INITIATED`, so it may mean returned to the seller.
- Carriers: `delhivery`, `shadowfax`, `bluedart`, `dhl`, `ekart`.
- Money: `cod_amount` on requests is rupees. Other amounts are integer paise.
- The client must not send `merchant_id`, and reuses `idempotency_key` when retrying.
- Live updates use polling, because the backend has no SSE or WebSocket.

### Backend gaps to raise with the backend team

1. Gateway merchant authentication and login, which also unblock `POST /api/v1/shipments`.
2. A shipment read service matching the gateway's list shape. Order-engine differs in auth, response shape and fields.
3. Gateway routes for shipment detail, wallet and COD.
4. Auth and merchant scoping on tracking.
5. Reconciliation likely fails to boot, is in-memory and has no auth.
6. `merchant_id` is missing from adapter events, which stops webhook deliveries.
7. Serviceability, rates, pickups and cancel routes do not exist.

## 7. Running locally

Mock mode needs no backend. For live checks, Docker Desktop must be installed, because the gateway needs Kafka to start:

```bash
# from Evoc_ships; shell env vars avoid adding a .env file to the backend
docker compose -f infra/docker-compose.yml up -d --wait redpanda
DASHBOARD_MOCK_MODE=true node services/gateway/dist/main.js
```

The frontend runs on port 3100, so it can sit beside `apps/dashboard` on 3000.

## 8. Testing

- Unit tests with TDD for the gateway client, error mapping, formatters and data-source selection.
- Playwright screenshots at desktop and phone width for each UI.
- Per stage: typecheck, lint, palette check, a search of `.next/static` for dev tokens, and a check that `Evoc_ships` is unchanged.

## 9. Out of scope for now

- Support-key screens.
- Real login, OTP or email delivery, until the backend provides them.
- Screens beyond the 37-task plan (section 11), until directed. Stage 2 and every planned screen are built; see `Readme.md` for the current screen table.

## 11. Navigation and scope addendum (2026-11-10)

These were agreed with the project owner on 2026-11-10.

- **Navigation:** the sidebar takes the menu from the new reference images, in the existing blue Sharkship style, keeping its collapse behaviour and phone slide-in menu.
- **Extra screens:** screens not in that menu are grouped as Settings sections. Bulk upload and Pickups go under Shipping Management.
- **Help & Support:** two sub-pages, Support tickets and Help centre.
- **Sign-in landing:** sign-in still lands on `/dashboard`, so no existing test changes. Sign-up lands on `/home`.
- **Visual design:** new screens have no reference images, so they follow `sharkship.in-design.md` and the patterns of the screens already built. If a reference arrives later, it is applied as a follow-up task.

### Navigation map

`Status` is `live` once the screen exists. A `planned` entry shows disabled, with the title "<label> is not available yet".

| Group | Item | Route | Built in |
|---|---|---|---|
| Home | | `/home` | Task 3 |
| Dashboard | | `/dashboard` (tabs via `?tab=`) | Built; tabs in Tasks 20–23 |
| Shipping Management | All Shipments | `/orders` | Built; connection in Task 4 |
| | B2C Shipments | `/orders/b2c` | Task 5 |
| | B2B Shipments | `/orders/b2b` | Task 6 |
| | Create Shipment | `/orders/create` | Built; connection in Task 4 |
| | Bulk Upload | `/orders/bulk` | Task 7 |
| | Pickups & Manifests | `/orders/pickups` | Task 8 |
| Operations | NDR | `/ndr` | Built; connection in Task 9 |
| | RTO | `/rto` | Task 10 |
| Billings | Wallet Transactions | `/finances/wallet` | Built; recharge in Task 11 |
| | COD Remittance | `/finances/cod` | Built |
| | Invoice | `/finances/invoices` | Task 12 |
| Reconciliation | Weight | `/reconciliation/weight` | Task 13 |
| | Weight Settings | `/reconciliation/weight-settings` | Task 14 |
| Tools | Rate Card | `/tools/rate-card` | Task 15 |
| | Rate Calculator | `/tools/rate-calculator` | Task 16 |
| | Order Tracking | `/tools/tracking` | Task 17 |
| Reports | | `/reports` | Task 19 |
| Settings | | `/settings`, with the sections below | Task 24 |
| Help & Support | Support Tickets | `/support/tickets` | Task 32 |
| | Help Centre | `/support/help` | Task 33 |

Settings sections, listed on `/settings` rather than in the sidebar:

| Section | Route | Built in |
|---|---|---|
| Profile | `/settings/profile` | Task 24 |
| Company & KYC | `/settings/company` | Task 25 |
| Users & Roles | `/settings/users` | Task 26 |
| Pickup Addresses | `/settings/pickup-addresses` | Task 27 |
| API Keys & Channel Integrations | `/channel-integrations` (existing) | Built |
| Buyer Notifications | `/settings/notifications` | Task 28 |
| Tracking Page | `/settings/tracking-page` | Task 29 |
| Courier Rules | `/settings/courier-rules` | Task 30 |
| Sub-merchants | `/settings/sub-merchants` | Task 31 |

Outside the shell:
- `/track/[awb]`, the public tracking page buyers open (Task 18).
- `/forgot-password` (Task 34) and `/signup` (Task 35).
- Not-found and error pages (Task 36).

### What the backend offers

This was checked against `Evoc_ships` at `aace603`. It decides what "connection" means for each screen.

| Gateway route | State | Used by |
|---|---|---|
| `GET /api/v1/shipments/stats` | Only with `DASHBOARD_MOCK_MODE=true` and a demo token | Dashboard, Home, Delivered tab |
| `GET /api/v1/shipments?status&carrier&from&page&limit` | Same as stats. `status` must be one of the 9 normalized statuses, `limit` 1–100, any other key returns 400 | All Shipments, B2C, RTO, Home, Reports |
| `GET /api/v1/shipments/:id/tracking` | Live through tracking-engine, with no auth | AWB search, Order Tracking, public tracking, order detail timeline |
| `POST /api/v1/shipments` | Always 503 `Shipment creation is disabled until merchant authentication is configured` | Create Shipment, Bulk Upload |
| `/api/v1/webhooks*` | Live, with a merchant key of at least 32 characters | Channel Integrations |
| Everything else | No route | Every other feature: `notAvailable()` in gateway mode |

For features with no route, "connection" means:
- the gateway service exists and is selected by its `DATA_SOURCE_` variable;
- it returns `notAvailable()`;
- a test proves the screen then shows "This data is not available yet." with Try again, and no sample badge.

When the backend adds the route, only that one gateway file changes.
