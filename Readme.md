# Evoc Logistics Frontend

The web frontend for the Evoc logistics platform. Merchants will use it to manage shipments, tracking, COD and webhooks.

The final product name and logo are still to be supplied, so "Evoc Logistics" is a working name.

> **Status:** the login page is done, and the main dashboard, Wallet Transactions, COD Remittance and Channel Integrations are built and awaiting review. Sign-in is a demo, because the backend has no login yet. See [updatesDoc.md](updatesDoc.md) for what has been done so far.

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
| `src/components/shell/` | Sidebar, top bar and AWB search, shared by signed-in pages |
| `src/lib/format/` | Money, date, status and user name formatting |
| `src/lib/gateway/` | Server-only gateway client, and the mapping of all backend errors to one `ApiError` |
| `src/lib/data/` | Data source selection, and one folder per feature as screens are built |
| `src/lib/auth/` | Server-only credential lookup |
| `vendor/` | Packed copy of the backend's `@logicore/contracts` |
| `e2e/` | Browser tests |

### Real and sample data

Each feature has a gateway version and a mock version. It uses mock until switched with an environment variable, for example `DATA_SOURCE_SHIPMENTS=gateway`. Every result records its source, so screens can show a "Sample data" badge.

| Feature | Variable | Gateway route today |
|---|---|---|
| Shipment counts | `DATA_SOURCE_SHIPMENTS` | Yes, but the gateway serves only its own mock data for now |
| AWB search | `DATA_SOURCE_TRACKING` | Yes, needs tracking-engine |
| Webhooks and delivery history | `DATA_SOURCE_WEBHOOKS` | Yes, needs the webhooks service and Postgres |
| Sign-in | `DATA_SOURCE_SESSION` | No |
| KPI cards, NDR | `DATA_SOURCE_OVERVIEW` | No |
| Wallet balance and transactions | `DATA_SOURCE_WALLET` | No |
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
| Main dashboard | [sharkship.in-design.md](sharkship.in-design.md) | 2 | Sample by default; shipments and AWB search can use the gateway | Built, awaiting review |
| Wallet Transactions, at `/finances/wallet` | [sharkship.in-design.md](sharkship.in-design.md) | Finances | Sample only, as the gateway has no wallet routes | Built, awaiting review. No sidebar link yet |
| COD Remittance, at `/finances/cod` | [sharkship.in-design.md](sharkship.in-design.md) | Finances | Sample only, as the gateway has no COD routes | Built, awaiting review. No sidebar link yet |
| Channel Integrations, at `/channel-integrations` | [sharkship.in-design.md](sharkship.in-design.md) | Integrations | Sample by default; webhooks can use the gateway. API keys have no routes | Built, awaiting review. No sidebar link yet |

Further screens are added one at a time, as directed.

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
