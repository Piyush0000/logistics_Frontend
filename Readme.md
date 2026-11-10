# Evoc Logistics Frontend

The web frontend for the Evoc logistics platform. Merchants will use it to manage shipments, tracking, COD and webhooks.

The final product name and logo are still to be supplied, so "Evoc Logistics" is a working name.

> **Status:** the login page is done, and the main dashboard, Orders & NDR, Wallet Transactions, COD Remittance and Channel Integrations are built and merged to main. Sign-in is a demo, because the backend has no login yet. See [updatesDoc.md](updatesDoc.md) for what has been done so far.

## Getting started

You need Node 22.12 or newer (`.nvmrc` pins 24) and pnpm 9.

```bash
pnpm install
pnpm exec playwright install chromium   # only needed for browser tests
pnpm dev                                # http://localhost:3100
```

No environment file is needed yet. Later stages use the variables listed in [.env.example](.env.example), copied to `.env.local`.

### Signing in

Opening the app sends you to `/login`. Sign-in is a demo and no email is sent:

- **Email OTP:** use the code shown on screen, `123456`.
- **Email + Password:** any password of 8 or more characters works.

**Do not deploy the demo sign-in publicly.** It accepts any email. Replace it when the backend adds login routes, in `src/lib/data/session/gateway.ts`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the app with hot reload on port 3100 |
| `pnpm build` | Creates a production build |
| `pnpm start` | Serves the production build on port 3100 |
| `pnpm lint` | Runs ESLint |
| `pnpm typecheck` | Checks TypeScript types |
| `pnpm test` | Runs the unit tests |
| `pnpm test:e2e` | Runs browser tests at desktop and phone sizes on port 3101, so `pnpm dev` can stay running. Run `pnpm build` first |
| `pnpm contracts:update` | Repacks `@logicore/contracts` from the backend into `vendor/` |
| `node scripts/dev-smoke.mjs` | Opens every route in `e2e/routes.ts` under `next dev` on port 3107 and fails on any browser error. Stop `pnpm dev` first: Next.js allows one `next dev` per folder |
| `node scripts/screenshots.mjs [--menu] [route ...]` | Saves desktop, phone and 320px screenshots to `test-results/screenshots/`, from the build on port 3102. Run `pnpm build` first. In Git Bash, prefix `MSYS_NO_PATHCONV=1` so routes stay as typed |

## How it connects to the backend

The backend lives in the separate `Evoc_ships` directory and must not be changed. All frontend work happens in this directory.

The frontend talks only to the backend's gateway on port 8080. Server code makes every call, so merchant keys never reach the browser and CORS isn't involved.

Many backend features aren't available through the gateway yet. Screens use real data where a route exists and clearly labelled sample data where it doesn't. The [design spec](docs/superpowers/specs/2026-11-04-frontend-design.md) lists the routes and the backend gaps.

### Code layout

| Path | Purpose |
|---|---|
| `src/app/` | Pages, layout and `globals.css`, which holds the design tokens |
| `src/app/(auth)/` | Login and terms pages, using the `theme-auth` settings |
| `src/app/(app)/` | Signed-in pages, using the `theme-app` settings |
| `src/components/brand-mark.tsx` | The placeholder name and logo. Change them here only |
| `src/components/shell/` | Sidebar, top bar and AWB search, shared by signed-in pages. `nav-config.ts` holds the sidebar menu |
| `src/components/ui/` | Shared screen parts: page header, data card, empty state, stat tile, pagination, dialog and form fields |
| `src/lib/url-params.ts` | Safe parsing of `page`, `limit`, enum and text URL parameters |
| `src/lib/csv.ts` | CSV building for downloads |
| `src/lib/bulk-shipments.ts` | Reads the Bulk Upload CSV into shipment requests. `public/samples/bulk-shipments-template.csv` is its template |
| `src/lib/format/` | Money, date, status and user name formatting |
| `src/lib/gateway/` | Server-only gateway client, and the mapping of all backend errors to one `ApiError` |
| `src/lib/data/` | Data source selection, and one folder per feature as screens are built |
| `src/lib/auth/` | Server-only credential lookup |
| `vendor/` | Packed copy of the backend's `@logicore/contracts` |
| `e2e/` | Browser tests. `screen-checks.ts` holds the shared size, tap-target and signed-out checks, and `routes.ts` lists every route |
| `scripts/` | Development scripts: dev-mode check, screenshots, contracts update |

### Real and sample data

Each feature has a gateway version and a mock version. It uses mock until switched with an environment variable, for example `DATA_SOURCE_SHIPMENTS=gateway`. Every result records its source, so screens can show a "Sample data" badge.

| Feature | Variable | Gateway route today |
|---|---|---|
| Shipment counts | `DATA_SOURCE_SHIPMENTS` | Yes, but the gateway serves only its own mock data for now |
| Shipment list and booking in Orders | `DATA_SOURCE_ORDERS` | List: yes, same limits as shipment counts, and search covers the loaded page only. Booking: the route exists but answers 503 until merchant authentication is set up, so the form says booking is not available. No detail route, so shipment facts stay sample data |
| AWB search and shipment timeline | `DATA_SOURCE_TRACKING` | Yes, needs tracking-engine |
| Webhooks and delivery history | `DATA_SOURCE_WEBHOOKS` | Yes, needs the webhooks service and Postgres |
| Sign-in | `DATA_SOURCE_SESSION` | No |
| KPI cards | `DATA_SOURCE_OVERVIEW` | No |
| NDR (screen, actions, Home tile) | `DATA_SOURCE_NDR` | No. Gateway shows it as unavailable |
| Wallet balance, transactions and recharge | `DATA_SOURCE_WALLET` | No |
| Home setup checklist | `DATA_SOURCE_ONBOARDING` | No |
| B2B shipments | `DATA_SOURCE_B2B` | No |
| Saved pickup addresses | `DATA_SOURCE_PICKUP_ADDRESSES` | No |
| Pickups and manifests | `DATA_SOURCE_PICKUPS` | No for scheduling and the pickup list, so gateway mode shows them as unavailable. The shipments ready to ship come from the shipments list route, through `DATA_SOURCE_ORDERS` |
| RTO (counts and lists) | `DATA_SOURCE_RTO` | Yes: counts from the stats route, lists from the shipments list route. RTO charges have no source, so gateway mode shows "Not available yet" |
| COD remittance | `DATA_SOURCE_COD` | No |
| Invoices and the invoice print view | `DATA_SOURCE_INVOICES` | No. Gateway mode shows them as unavailable |
| Weight discrepancies | `DATA_SOURCE_WEIGHT` | No. Gateway mode shows them as unavailable |
| Weight settings (package presets) | `DATA_SOURCE_WEIGHT_SETTINGS` | No. Gateway mode shows them as unavailable |
| Rate card | `DATA_SOURCE_RATES` | No. The backend keeps rate cards in memory and has no serviceability route, so gateway mode shows the rate card and quotes as unavailable |

In sample mode, AWB search knows `DEMOEK001` and `DEMODL002`.

Browser tests cover real-data mode using a stand-in gateway, `e2e/stub-gateway.mjs`. The real gateway hasn't been run yet, as it needs Docker.

## Design

Every screen uses the colour palette from [sharkship.in-design.md](sharkship.in-design.md). Tailwind's default colours are removed, so only palette colours are available.

Type, shape and control sizes come from the design file assigned to each group of screens. Add the class `theme-auth` or `theme-app` to a group, then use `font-heading`, `font-body`, `rounded-control`, `rounded-card`, `h-control` and `p-card`.

Screens are built for phones and desktops. Dashboard controls are 32px on desktop and 44px on touch devices, for comfortable tapping.

| Screen | Design file | Stage | Data | Status |
|---|---|---|---|---|
| Login | [meracourierwala.com-design.md](meracourierwala.com-design.md) | 1 | Sample only, as the backend has no login | Done |
| Home, at `/home` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 3 | Stats and recent shipments can use the gateway; wallet, NDR and the setup checklist are sample, or unavailable in gateway mode | Done. In the sidebar as Home |
| Main dashboard | [sharkship.in-design.md](sharkship.in-design.md) | 2 | Sample by default; shipments and AWB search can use the gateway | Merged to main |
| Orders & NDR | [sharkship.in-design.md](sharkship.in-design.md) | 3 | Shipment list, timeline and booking use the gateway when set (booking answers 503 today); facts on the detail page are sample data; NDR is sample data, or unavailable in gateway mode (Task 9) | Merged to main |
| Wallet Transactions, at `/finances/wallet` | [sharkship.in-design.md](sharkship.in-design.md) | Finances | Sample only, as the gateway has no wallet routes. Recharge button and popup added in Task 11 (no payment is taken) | Merged to main. In the sidebar under Billings |
| COD Remittance, at `/finances/cod` | [sharkship.in-design.md](sharkship.in-design.md) | Finances | Sample only, as the gateway has no COD routes | Merged to main. In the sidebar under Billings |
| B2C Shipments, at `/orders/b2c` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 5 | The All Shipments list, scoped to single-parcel shipments. Sample by default; uses the gateway list when set (every gateway shipment is single-parcel) | Done. In the sidebar under Shipping Management |
| B2B Shipments, at `/orders/b2b` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 6 | Sample only, as the gateway has no B2B route; gateway mode shows it as unavailable. The create dialog offers saved pickup addresses (sample) | Done. In the sidebar under Shipping Management |
| Bulk Upload, at `/orders/bulk` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 7 | Books each valid CSV row through the same path as Create Shipment (`DATA_SOURCE_ORDERS`): sample store by default; in gateway mode every row shows the booking-not-available message | Done. In the sidebar under Shipping Management |
| Pickups & Manifests, at `/orders/pickups` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 8 | Ready to ship uses the shipments list (`MANIFESTED` shipments), sample by default. Scheduled pickups and scheduling are sample only, and unavailable in gateway mode. The print page is at `/orders/pickups/manifest-print/[id]` | Done. In the sidebar under Shipping Management |
| RTO, at `/rto` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 10 | Stage tabs (In progress, Delivered), summary tiles and a list of returning shipments. Sample by default; gateway mode uses the stats and shipments list routes. RTO charges are sample only and show "Not available yet" in gateway mode. The courier status column is empty in gateway mode, because the list route does not send it | Done. In the sidebar under Operations; the dashboard RTO tile links here |
| Invoices, at `/finances/invoices` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 12 | Monthly shipping invoices with 18% GST, a year filter (`?year=`) and pages. Sample only; gateway mode shows it as unavailable. The print view is at `/finances/invoices/[id]`, laid out for A4, with a "Sample invoice. Not a tax document." banner on sample data | Done. In the sidebar under Billings |
| Weight discrepancies, at `/reconciliation/weight` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 13 | Couriers' weight disputes: declared against charged weight and the extra charge, with summary tiles, a status filter (`?status=`), an AWB search (`?q=`) and pages. Accept a charge, or dispute it with a note of 10 to 1,000 characters and 1 to 3 JPG or PNG images up to 5 MB (only file name, type and size are sent; no file is stored). Rows past their response window show "Response window closed" and cannot be disputed. Sample only; gateway mode shows it as unavailable | Done. In the sidebar under Reconciliation |
| Weight settings, at `/reconciliation/weight-settings` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 14 | Package presets: name (1 to 40 characters), size (1 to 500 cm each side), weight (0.1 to 1000 kg) and one default, up to 20 presets. Add, edit and delete (delete asks first). The form shows the chargeable weight as you type: the larger of the real weight and length × width × height ÷ 5,000, to 2 decimals (`src/lib/volumetric.ts`, also used by the Rate Calculator later). The default preset cannot be deleted while others exist; make another the default first. Sample only; gateway mode shows it as unavailable | Done. In the sidebar under Reconciliation |
| Rate card, at `/tools/rate-card` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 15 | Read-only shipping prices by courier and zone (A within city, B within state, C metro to metro, D rest of India, E special). A carrier filter (`?carrier=`; an unknown value shows every carrier), a zone legend, a table on desktop and one card per carrier on phones. Shows the base price for the first weight band, the price of each extra 500 g, and the COD fee as a percentage with a minimum. Sample only; gateway mode shows it as unavailable | Done. In the sidebar under Tools |
| Rate calculator, at `/tools/rate-calculator` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 16 | Pickup and delivery pincodes (6 digits, not starting with 0), weight, size and payment type (COD needs an amount). Returns a quote from every courier, cheapest first, with couriers that cannot ship last as Not serviceable. Each quote shows the chargeable weight, the larger of the real and volumetric weight. Price is the base price plus each started 500 g above the base weight, plus the COD fee for COD. Ship with this opens Create Shipment with `?carrier=`. The server checks the session and the input again. Sample only (the zone is worked out as the backend does); gateway mode shows it as unavailable | Done. In the sidebar under Tools |
| Order tracking, at `/tools/tracking` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 17 | One or more AWBs (commas, spaces or new lines, duplicates removed, at most 10). The AWBs stay in the URL as `?awb=`, so a result can be shared or reloaded. One AWB shows its status, courier, latest location, courier status and a timeline, newest first. Several show a summary list where each opens its timeline. An unknown AWB says No shipment found for this AWB.; any other failure shows its own message with Try again, and never hides the other AWBs. Share tracking link copies the public `/track/<awb>` address, and shows a selectable field when the browser blocks the clipboard. Sample data in mock mode; live through the gateway tracking route in gateway mode | Done. In the sidebar under Tools |
| Public tracking, at `/track/[awb]` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 18 | The page a buyer opens from a shared link. No sign-in and no app shell, only the brand mark. It shows the AWB, status, courier, a four-stage progress bar (Manifested, In transit, Out for delivery, Delivered) and the timeline with places and times. Returned, cancelled and failed shipments show a plain message instead of a step. It shows no names, phone numbers, addresses, amounts or IDs: `toPublicView` picks each field by name. Tells search engines not to index it. An unknown or over-long (more than 40 characters) AWB is a real 404; a gateway failure shows Try again. Calls the tracking route with no token | Done. Outside the sidebar |
| Reports, at `/reports` | [sharkship.in-design.md](sharkship.in-design.md) | Full build, Task 19 | Pick a From and To date (default: the last 30 days in Indian time, at most 92 days, to on or after from) and download one of five CSV reports: Shipments, NDR, RTO, COD remittance, Wallet transactions. `GET /reports/export?type&from&to` checks the session (401), validates (400) and builds the CSV, named `<type>-<from>-to-<to>.csv`. Shipments and RTO page through the shipments list route (up to 10 pages of 100); RTO joins RTO_INITIATED and RTO_DELIVERED. Mock data starts with the line `# Sample data`. A source with no gateway route (NDR, COD, wallet) answers 503 with its plain message | Done. In the sidebar as Reports |
| Channel Integrations, at `/channel-integrations` | [sharkship.in-design.md](sharkship.in-design.md) | Integrations | Sample by default; webhooks can use the gateway. API keys have no routes | Merged to main. Linked from Settings once Task 24 builds it |

Further screens are added one at a time, as directed.

### Sidebar menu

The sidebar is built from `NAV` in [src/components/shell/nav-config.ts](src/components/shell/nav-config.ts): Home, Dashboard, Shipping Management, Operations, Billings, Reconciliation, Tools, Reports, Settings and Help & Support. Groups with sub-pages open and close, and the group holding the current page starts open. Entries marked `planned` show greyed out with "<name> is not available yet".

### Adding a screen

Add the screen to `NAV` in `src/components/shell/nav-config.ts` as `planned`, and flip it to `live` once its page exists. Add its route to `e2e/routes.ts`, so the dev-mode check and screenshots include it. Build it with the parts in `src/components/ui/`. Task 37 adds the full checklist here.

## How the work is done

- Each UI is its own stage: design note, approval, build, screenshots, review, sign-off.
- The next stage starts only after sign-off.
- This file and [updatesDoc.md](updatesDoc.md) are updated in every stage, before it goes for review.

## Documents

| Document | Purpose |
|---|---|
| [updatesDoc.md](updatesDoc.md) | Running record of what has been done |
| [Design spec](docs/superpowers/specs/2026-11-04-frontend-design.md) | Architecture, design rules, backend reference and gaps |
| [sharkship.in-design.md](sharkship.in-design.md) | Colour palette for all screens, and the main dashboard design |
| [meracourierwala.com-design.md](meracourierwala.com-design.md) | Login page design |
