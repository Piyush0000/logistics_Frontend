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
| KPI cards, NDR | `DATA_SOURCE_OVERVIEW` | No |
| Wallet balance and transactions | `DATA_SOURCE_WALLET` | No |
| Home setup checklist | `DATA_SOURCE_ONBOARDING` | No |
| COD remittance | `DATA_SOURCE_COD` | No |

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
| Orders & NDR | [sharkship.in-design.md](sharkship.in-design.md) | 3 | Shipment list, timeline and booking use the gateway when set (booking answers 503 today); facts on the detail page and NDR are sample data | Merged to main |
| Wallet Transactions, at `/finances/wallet` | [sharkship.in-design.md](sharkship.in-design.md) | Finances | Sample only, as the gateway has no wallet routes | Merged to main. In the sidebar under Billings |
| COD Remittance, at `/finances/cod` | [sharkship.in-design.md](sharkship.in-design.md) | Finances | Sample only, as the gateway has no COD routes | Merged to main. In the sidebar under Billings |
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
