# Updates

A running record of what has been done on the Evoc Logistics frontend. Newest entries come first.

## Current status

| | |
|---|---|
| **Current stage** | Stage 3: Orders & NDR, built and awaiting review |
| **Waiting on** | Review and sign-off of the Orders and NDR screens |
| **Next step** | The next UI you direct, with its reference image and design file |
| **Also needed** | Final product name and logo; real left-panel copy; terms text; Docker Desktop to test against the real gateway |

## 2026-11-07: Stage 3 Orders and NDR

The design note was approved. Built Orders management (Shipment list, Shipment detail, Create shipment) and NDR management.

### Done

- Built `/orders` (Shipment List):
  - Desktop table and mobile card view.
  - Search by AWB / reference / customer, carrier filter dropdown, status tab filters (Manifested, In Transit, Out for Delivery, Delivered, RTO, Failed).
  - Pagination controls.
  - Links to `/orders/create` and `/ndr`.
  - Supports gateway connection via `DATA_SOURCE_ORDERS=gateway` with mock fallback and Sample data badge.
- Built `/orders/[id]` (Shipment Detail):
  - Complete shipment metadata: status badge, carrier badge, origin & delivery address cards, package dimensions & weight, items table, and COD/billing summary.
  - Full tracking event timeline.
  - Visibly labelled with Sample data badge (since backend gateway does not have a shipment detail route).
- Built `/orders/create` (Create Shipment):
  - Multi-section booking form validating against `@logicore/contracts` (`StandardShipmentRequestSchema`).
  - Origin & destination addresses (with 6-digit Indian pincode & 10-15 digit phone validation), package dimensions, weight, items list, payment mode (`PREPAID` vs `COD`), and preferred carrier.
  - Interactive submission with confirmation modal displaying newly generated AWB and direct link to order details.
  - Visibly labelled with Sample data badge (since gateway `POST /api/v1/shipments` unconditionally returns 503).
- Built `/ndr` (NDR Management):
  - 4 KPI summary tiles: Action Required, Re-attempted, NDR Delivered, NDR Returned.
  - Desktop table and mobile card view listing delivery attempt failures, failure reasons, and attempt counts.
  - Interactive Action Modal allowing merchants to request re-attempts with instructions or reschedule date, or initiate immediate Return to Origin (RTO).
  - Visibly labelled with Sample data badge.

### Files added or changed

- Orders: `src/app/(app)/orders/` (`page.tsx`, `filters.tsx`, `orders-table.tsx`, `orders-cards.tsx`, `actions.ts`), `src/app/(app)/orders/[id]/page.tsx`, `src/app/(app)/orders/create/` (`page.tsx`, `create-form.tsx`)
- NDR: `src/app/(app)/ndr/` (`page.tsx`, `ndr-view.tsx`, `ndr-action-modal.tsx`, `actions.ts`)
- Components: `src/components/orders/status-badge.tsx`, `src/components/orders/carrier-badge.tsx`
- Data: `src/lib/data/orders/` (`index.ts`, `gateway.ts`, `mock.ts`, `types.ts`, `orders.test.ts`), `src/lib/data/ndr/` (`index.ts`, `mock.ts`, `types.ts`, `ndr.test.ts`), `src/lib/gateway/schemas/orders.ts` (`orders.test.ts`)
- Helpers: `src/lib/format/date.ts` (`formatDate`)
- E2E Tests: `e2e/orders.spec.ts`
- Documentation: `playwright.config.ts`, `Readme.md`, `updatesDoc.md`

### Verification

All of these ran from a clean build:

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 113 of 113 passed (14 test files) |
| `pnpm test:e2e` | 226 passed, 18 skipped |
| Sideways scrolling | Verified no sideways scrolling at 320x568, 360x640, 390x844, 768x1024, 1366x768, and 1920x1080 across all new screens |
| Mobile tap targets | All mobile links, cards, and buttons are >= 44px tall |
| Screenshots | Captured and reviewed desktop and phone screenshots for list, detail, create shipment, and NDR |
| Colours outside palette | None (Sharkship tokens strictly used) |
| `Evoc_ships` | Completely untouched and clean |

**Not yet verified:**
- Live backend gateway with Docker (gateway requires Kafka/Redpanda and `DASHBOARD_MOCK_MODE=true`).
- Real iOS and Android physical hardware (verified on Playwright Pixel 7 emulation and iPhone SE viewport).

## 2026-11-07: Channel Integrations popup fix

Sai Manideep found that every popup on this page closed itself straight away under `pnpm dev`.

### Done

- Fixed the shared popup in `dialog.tsx`. React's dev mode starts each component twice, and the first cleanup closed the popup, which the page took as the person closing it.
- Available Events can now be clicked, as in the reference. The popup shows that event's payload, buttons to switch event, and Copy Payload.
- View Sample Payloads now has View Details on each event, which opens the same view.

### Verification

| Check | Result |
|---|---|
| Reproduced under `pnpm dev` | Create, Sample Payloads, Edit and Delete all disappeared before the fix |
| After the fix, under `pnpm dev` | All stayed open, including an event opened from Available Events |
| Wallet and COD under `pnpm dev` | Dropdowns and calendars stayed open, with no browser errors |
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 204 of 204 passed |
| `pnpm test:e2e` | 344 passed, 21 skipped |

**Why the tests missed it:** browser tests run production builds, and React only starts components twice in dev mode. There is no lasting test for this, because a second `next dev` cannot run beside `pnpm dev` in the same folder. The dev-mode check was a one-off script.

**Lesson:** check new screens under `pnpm dev` as well as the production tests.

## 2026-11-06: Channel Integrations

The design note was approved by Sai Manideep, including the defaults below. This was built on `sai/wallet` with the two Finances screens, so all three share one branch and PR.

### Done

- Built `/channel-integrations` with API Keys and Webhooks tabs.
- Webhooks can be listed, created, edited and deleted. The form follows the backend's rules: a public HTTPS address and at least one of the three events.
- The signing secret appears once after creating, with Copy and a warning. It is never stored in the page or the URL.
- Webhook Information shows the backend's real headers and signing method. Sample Payloads use the backend's real format.
- Added Delivery history with Retry for failed deliveries, using the merchant retry route. The reference images did not show this, but the backend supports it.
- The API Keys tab says keys are not available yet, and Create API Key is disabled, so nobody receives a fake key.
- Webhooks use labelled sample data by default. `DATA_SOURCE_WEBHOOKS=gateway` switches to the real routes.

### Files added or changed

- Page: `src/app/(app)/channel-integrations/`, including `actions.ts`
- Data: `src/lib/data/webhooks/`, `src/lib/gateway/schemas/webhooks.ts`
- Tests: `e2e/integrations.spec.ts`, `e2e/gateway.spec.ts`, `e2e/stub-gateway.mjs`, and unit tests beside the logic
- Also changed: `playwright.config.ts`, `.env.example`
- No shared files were changed. The gateway client already handled the empty response from a delete.

### Verification

All of these ran from a clean build on 2026-11-06, covering every screen:

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 204 of 204 passed |
| `pnpm test:e2e` | 338 passed, 21 skipped. The skipped checks only apply to the other screen size |
| Real-data mode | List, create, edit, delete and retry tested with the stand-in gateway, with no sample label |
| Backend down | Tested: both cards show the error and Try again, and Create Webhook is hidden |
| Server actions | Tested: all four refuse a signed-out caller before touching any data |
| Sideways scrolling | None at 9 sizes, from 320x568 to 1920x1080 |
| Tap targets on phones | Tabs, buttons, form fields and event switches are at least 44px tall |
| Screenshots | Reviewed at desktop, phone and 320px wide, plus the create, secret and payload popups and API Keys |
| Colours outside the palette, or reference brand, in the new code | None |
| Dev tokens or gateway settings in the browser bundle | None |
| `Evoc_ships` | Unchanged at commit `c028917` |

Tests were written first and seen failing.

**Not yet verified:**
- The real gateway and webhooks service, which need Docker and Postgres. The stand-in copies their response shapes from the source.
- A real webhook arriving at a real address, or a real signature being checked.
- Real iOS and Android browsers.

### Decisions

- Name and Active are left out, because the backend cannot store or change them. Status is shown as a label.
- Only the three events the backend accepts are offered: `shipment.created`, `shipment.status.updated` and `shipment.failed`.
- Download API Documentation is left out, because no document exists.
- Sample webhooks are kept in server memory, are shared by everyone using that server, and reset on restart.
- The sidebar stays locked, at Sai's request.

### Pending

- Lead approval for the sidebar links.
- Backend login. Demo sign-in has no merchant key, so gateway mode works only locally, with a `DEV_WEBHOOK_TOKEN` of at least 32 characters.
- API key routes from the backend team.

## 2026-11-06: COD Remittance

The design note was approved by Sai Manideep. Sai chose to build this on `sai/wallet` with Wallet Transactions, so both screens share one branch and PR. Nothing has been committed yet.

### Done

- Built `/finances/cod`: heading with Export CSV, four summary cards, filters, the remittance table, rows per page and page arrows.
- The table becomes a card for each order below 1280px, so phones never scroll sideways.
- Filters are Status, From Date and To Date, kept in the URL. Dates apply to the collected date, and the summary cards ignore filters.
- Export CSV downloads every row matching the filters, not only the current page. The route checks the session itself and guards against spreadsheet formulas.
- Sample exports are labelled in the file name and on the first line of the file.
- All COD data is labelled sample data. In gateway mode the page shows "not available" with Try again, and the export is off.

### Files added or changed

- Page: `src/app/(app)/finances/cod/`, including `export/route.ts`
- Data: `src/lib/data/cod/` (`filters.ts`, `types.ts`, `mock.ts`, `gateway.ts`, `csv.ts`, `index.ts`)
- Helpers: `formatDate` in `src/lib/format/date.ts`
- Tests: `e2e/cod.spec.ts`, `e2e/gateway.spec.ts`, and unit tests beside the logic
- Also changed: `playwright.config.ts`, `.env.example`
- Reused from Wallet Transactions: the dropdown and calendar fields. From the dashboard: `KpiCard` and `DetailCard`

### Verification

All of these ran from a clean build on 2026-11-06, covering both screens:

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 162 of 162 passed |
| `pnpm test:e2e` | 286 passed, 19 skipped. The skipped checks only apply to the other screen size |
| Sideways scrolling | None at 9 sizes, from 320x568 to 1920x1080 |
| Tap targets on phones | Export, fields, Apply, Clear, rows per page and page arrows are at least 44px tall |
| CSV download | Tested: filtered rows, all pages, sample label and refused when signed out |
| Screenshots | Reviewed against the reference at desktop, 1024px, phone and 320px wide, plus the open Status list |
| Colours outside the palette, reference brand or data in the new code | None |
| Dev tokens or gateway settings in the browser bundle | None |
| `Evoc_ships` | Unchanged at commit `c028917` |

Tests were written first and seen failing. Two tests were wrong and were corrected: one named the wrong order number, and one compared text in two formats.

**Not yet verified:**
- Real COD data, because no route exists.
- The CSV opened in Excel or Google Sheets.
- Real iOS and Android browsers.

### Decisions

- Status uses Pending and Settled for both the filter and the rows. The reference's filter said Processing while its rows said pending.
- Next Remittance is the five oldest pending orders, so it differs from Total Remittance Due. This is sample logic until the backend defines a settlement cycle.
- Rows per page is 10, 20 or 50, because the reference's selector was blank.
- A deduction of zero is plain text, and real deductions use a red tint with dark text.
- The sidebar is unchanged, so this page also opens only by URL.

### Pending

- Lead approval for the Finances sidebar links.
- Reference images for Channel Integrations.
- Gateway routes for COD, and a per-order remittance list, from the backend team.

## 2026-11-06: Wallet Transactions

The design note was approved by Sai Manideep. Work is on the branch `sai/wallet`. All git steps are run by hand.

### Done

- Built `/finances/wallet`: balance card, filters, transaction list and Previous/Next.
- Filters are Transaction Type, Debit Type, From Date and To Date. They live in the URL, so refresh and the back button work.
- The dropdowns and calendar are hand-built, with keyboard support and no new dependencies.
- Debit Type turns off for credits. A From Date after To Date is stopped with a message, including when typed into the URL. Unknown URL values are ignored.
- All wallet data is labelled sample data, because the gateway has no wallet routes. In gateway mode the page shows "not available" with Try again, and never sample figures.

### Files added or changed

- Page: `src/app/(app)/finances/wallet/`
- Data: `src/lib/data/wallet/` (`filters.ts`, `types.ts`, `mock.ts`, `gateway.ts`, `index.ts`)
- Helpers: `src/lib/format/calendar.ts`, `src/lib/format/date.ts`
- Tests: `e2e/wallet.spec.ts`, `e2e/gateway.spec.ts`, and unit tests beside the logic
- `playwright.config.ts` now starts a server on port 3106 with the wallet in gateway mode

### Verification

All of these ran from a clean build on 2026-11-06:

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 133 of 133 passed |
| `pnpm test:e2e` | 229 passed, 18 skipped. The skipped checks only apply to the other screen size |
| Sideways scrolling | None at 8 sizes, from 320x568 to 1920x1080, with the calendar open |
| Tap targets on phones | Fields, Apply, Clear, Next, calendar and list options are at least 44px tall |
| Screenshots | Reviewed against the reference at desktop, phone and 320px wide, plus the open dropdown and calendar |
| Colours outside the palette, reference brand or data in the new code | None |
| Dev tokens or gateway settings in the browser bundle | None |
| `Evoc_ships` | Unchanged at commit `c028917` |

Tests were written first and seen failing. One browser test was wrong about which month the calendar opens on, and was corrected.

**Not yet verified:**
- Real wallet data, because no route exists.
- Real iOS and Android browsers.

### Decisions

- The sidebar is shared code and needs the lead's approval, so it is unchanged. The page opens only by URL, and the sidebar still highlights Overview.
- Recharge is left out, because the top bar is shared and no payment route exists.
- RTO Freight was added as an eighth debit type. The reference's rows are RTO charges, but the visible part of its list has no such type.
- The calendar uses Previous and Next month buttons. The reference's month dropdown was not built.
- Clear is a labelled button, in place of the reference's trash icon.
- Amounts use dark text on a tinted pill, for contrast.

### Pending

- Lead approval for the sidebar change.
- The full debit type list.
- Reference images for COD Remittance and Channel Integrations.

## 2026-11-05: Stage 2 main dashboard

The design note was approved, including the status mapping, the disabled date filter and the Quick menu. A third image was supplied as the sidebar reference, replacing the proposed sidebar list.

### Done

- Built the app shell: a blue icon rail that expands over the page, the top bar, and a slide-in menu on phones.
- The sidebar has the ten sections from the reference. Only Overview works, and the rest are disabled until directed.
- The top bar has AWB search, Quick menu, wallet balance with refresh, and the account menu with Sign out.
- Built the Overview tab: alert ticker, title, date range, tabs, four KPI cards, Shipments Details and NDR Details.
- AWB search takes up to 10 AWBs, separated by commas, spaces or new lines, and each one gets its own result or message.
- Shipment counts and AWB search can use the gateway. KPIs, NDR and wallet are sample data, because the backend has no routes for them.
- Every sample figure is labelled. If the gateway fails, only the affected card shows an error with Try again, and the rest of the page keeps working.
- The temporary dashboard page is gone.

### Files added or changed

- Shell: `src/components/shell/`, `src/components/sample-badge.tsx`, `src/components/brand-mark.tsx`
- Dashboard: `src/app/(app)/dashboard/` (`page.tsx`, `sections.tsx`, `retry-button.tsx`, `loading.tsx`), `src/app/(app)/actions.ts`
- Data: `src/lib/data/shipments/`, `tracking/`, `overview/`, `wallet/`, `not-available.ts`, `src/lib/gateway/schemas/shipments.ts`
- Helpers: `src/lib/format/`, `src/lib/awb.ts`
- Tests: `e2e/dashboard.spec.ts`, `e2e/gateway.spec.ts`, `e2e/stub-gateway.mjs`, and unit tests beside the logic
- Also changed: `src/app/globals.css`, `.env.example`, `playwright.config.ts`, `e2e/foundation.spec.ts`, `e2e/login.spec.ts`

### Verification

All of these ran from a clean build:

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 96 of 96 passed |
| `pnpm test:e2e` | 169 passed, 17 skipped. The skipped checks only apply to the other screen size |
| Sideways scrolling | None at 8 sizes, from 320x568 to 1920x1080, including a landscape phone |
| Tap targets on phones | Menu, Quick, refresh, account and search are at least 44px tall |
| Real-data mode | Tested with a stand-in gateway: live numbers show with no sample label |
| Backend down | Tested: the shipments card and search show the error, and the rest of the page works |
| Screenshots | Reviewed at desktop, laptop, tablet, phone and small phone, plus the sidebar, phone menu and search |
| Colours outside the palette, reference brand or data in `src` | None |
| Dev tokens or gateway settings in the browser bundle | None |
| `Evoc_ships` | Unchanged at commit `aace603` |

Problems found and fixed along the way:
- Tests found that keyboard focus didn't move into the phone menu when it opened.
- Screenshot review found the search hint cut off on phones, an awkward sidebar footer, and KPI values out of line on phones.

The test for level KPI values was written alongside its fix, so it wasn't seen failing first.

**Not yet verified:**
- The real gateway. The stand-in copies its response shapes from the source, but Docker is needed to run the real one.
- Gateway calls with a dev token. Browser tests run production builds, where dev tokens are ignored by design. A unit test covers the token being sent.
- Real iOS and Android browsers.

### Decisions

- The sidebar shows the placeholder Evoc mark in place of the logo in the reference.
- The expanded sidebar overlays the page, as in the reference, rather than pushing it across.
- The dashboard counts are the gateway's all-time totals, so the date range is shown disabled.
- The top bar scrolls away on phones to leave more room for content, and stays fixed on desktop.
- Ticker text is a labelled placeholder. The reference's surcharge notice was not copied.

### Pending

- Review and sign-off of the dashboard.
- Which UI to build next.
- Sub-menu contents for Orders, Finances, Buyer Experience and Business Tools, which the reference doesn't show.

## 2026-11-04: Login phone layout

Review found the phone login looked mostly empty, with all the spare space below the form. After this change the login was accepted, and work moved on to Stage 2.

### Done

- On tall phones, the blue header now takes about 30% of the screen and adds a description and a flat version of the shipping route.
- The sign-in block sits vertically centred in the remaining space, with equal gaps above and below.
- Headings and the demo chip are centred on phones, including the code step. Form fields and labels stay left-aligned.
- Phones under 700px tall keep the compact header, so the form stays near the top.
- Tablet and desktop layouts are unchanged.

### Files changed

- `src/app/(auth)/login/page.tsx`, `brand-panel.tsx`, `otp-step.tsx`
- `src/components/brand-mark.tsx`
- `e2e/login.spec.ts`

### Verification

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 67 of 67 passed |
| `pnpm test:e2e` | 101 passed, 11 skipped. The skipped checks are phone-only, in the desktop run |
| Balance | Gaps above and below the form match within 2px at 360x800, 390x844 and 412x915, on all three sign-in states |
| Screenshots | Reviewed on phone, small phone and desktop |
| `Evoc_ships` | Unchanged at commit `aace603` |

The 11 new phone tests were seen failing before the change. Real phones are still untested.

## 2026-11-04: Stage 1 login page

Stage 0 was signed off and the login design note approved. The login page was built from image 1, using `meracourierwala.com-design.md` for type and shape and the Sharkship colours.

### Done

- Built the login page at `/login`: blue brand panel with a dashed shipping route, and sign-in on the right. Phones get a compact header and a single column.
- Built both sign-in methods, with a code entry step, Back and Resend for Email OTP.
- Submit stays disabled until the email is valid and the terms are ticked, and the rules are checked again on the server.
- Added a show/hide password button, the phone number keypad and one-time-code autofill for the code, and arrow-key support on the tabs.
- Details typed before a slow page finishes loading are kept.
- Added a placeholder terms page at `/terms`.
- Added a temporary `/dashboard` page with Sign out. `/` now sends people to login or the dashboard, and the Stage 0 theme page is gone.

### Files added or changed

- Login: `src/app/(auth)/login/` (`page.tsx`, `brand-panel.tsx`, `login-form.tsx`, `fields.tsx`, `otp-step.tsx`, `actions.ts`, `login-state.ts`)
- Other pages: `src/app/(auth)/layout.tsx`, `src/app/(auth)/terms/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/page.tsx`
- Logic: `src/lib/auth/login-schema.ts`, `src/lib/auth/session.ts`, `src/lib/data/session/`
- Shared: `src/components/brand-mark.tsx`
- Tests: `e2e/login.spec.ts`, `e2e/helpers.ts`, `e2e/foundation.spec.ts`, and unit tests beside the logic
- `playwright.config.ts` now uses port 3101, so tests can run while `pnpm dev` is open

### Verification

| Check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test` | 67 of 67 passed |
| `pnpm test:e2e` | 88 passed, 2 skipped. The skipped checks are phone-only, in the desktop run |
| Sideways scrolling | None at 8 sizes, from 320x568 to 1920x1080, including a landscape phone |
| Tap targets on phones | Tabs, email field, submit and terms link are at least 44px tall |
| Screenshots | Reviewed at desktop, laptop, tablet, phone and small phone, plus the error and code steps |
| Colours outside the palette in `src` | None |
| Reference brand names in `src` | None |
| Dev tokens or gateway settings in the browser bundle | None |
| `Evoc_ships` | Unchanged at commit `aace603` |

Screenshot review found two problems the tests had missed, and each now has a test:
- The terms box looked unticked after a failed sign-in, because React resets forms after an action.
- On the password tab, Terms sat between Email and Password.

**Not yet verified:**
- Real iOS and Android browsers. Phone checks use Chromium with a Pixel 7 profile, plus an iPhone SE screen size.
- One-time-code autofill, which needs a real phone and a real message.

### Decisions

- The "Secure email verification" badge became "Demo sign-in: no email is sent", because real verification doesn't exist yet.
- Demo sessions use their own `evoc_demo_session` cookie. The real session cookie is sent to the gateway as a merchant key, so a fake value must never go in it.
- The headline and panel copy are new, so nothing is copied from the reference.
- The overline uses sentence case. The design file says uppercase isn't a major feature, and the reference's uppercase line carried its brand name.

### Pending

- Review and sign-off of the login page.
- Final name and logo, real left-panel copy, and terms text.
- Real login from the backend. **The demo sign-in accepts any email, so it must not be deployed publicly.**

## 2026-11-04: Stage 0 foundation

The design spec was reviewed and approved, and the foundation was built. There are no product screens in this stage.

### Done

- Set up Next.js 16, React 19, TypeScript, Tailwind 4, ESLint, Vitest and Playwright, on port 3100.
- Added the Sharkship colours as the only colours available, and removed Tailwind's defaults.
- Added separate theme settings for the login and signed-in screen groups.
- Built in phone support: 44px dashboard controls on touch devices, 16px form text so iOS doesn't zoom, and safe viewport settings.
- Built the server-only gateway client, which turns every backend error format into one error shape.
- Built the switch between real and sample data for each feature.
- Built the server-only credential lookup, with separate shipment and webhook keys.
- Packed the backend contracts into `vendor/`, with a `contracts:update` command to refresh them.
- Added security headers and a temporary `/` page for checking the themes.

### Files added

- Config: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.gitignore`, `.nvmrc`
- App: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Logic and tests: `src/lib/gateway/`, `src/lib/data/`, `src/lib/auth/`, `src/lib/contracts.test.ts`, `e2e/foundation.spec.ts`
- Other: `scripts/update-contracts.mjs`, `vendor/logicore-contracts-0.1.0.tgz`, `test/stubs/server-only.ts`
- `AGENTS.md` is written automatically by `next dev`. It is kept because Next.js re-creates it if removed.

### Verification

All of these ran after deleting `node_modules` and `.next` and reinstalling from the lockfile:

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | 46 of 46 passed |
| `pnpm build` | Passed |
| `pnpm test:e2e` | 12 of 12 passed, 6 each at desktop and phone size |
| `pnpm dev` | Answered with 200; screenshots reviewed at both sizes |
| `pnpm contracts:update` | Passed; the lockfile stayed valid afterwards |
| Colours outside the palette in `src` | None |
| Dev tokens or gateway settings in the browser bundle | None. No page uses them yet, so repeat this check in Stage 2 |
| `Evoc_ships` | Unchanged at commit `aace603` |

Tests were written first and seen failing before the code was added.

**Not yet verified:**
- The gateway client was tested against a local test server, not the real gateway, because Docker isn't available here.
- The real iOS and Android browsers haven't been tested. Phone checks use Chromium with a Pixel 7 profile.
- `merchantCredential`, which reads the session cookie, isn't used by a page yet. Only its selection logic is tested.

### Decisions

- Pinned TypeScript 5.9 and ESLint 9 rather than the newest major versions, for compatibility with Next's lint tooling. pnpm marks ESLint 9 as deprecated, so it needs a later upgrade.
- Node 22.12 or newer is required, because Vitest 5 needs it. The backend's Node 20 is unaffected.
- Number formatters and API response schemas come with the screens that need them, not in Stage 0.
- Dashboard card padding is 16px on phones instead of Sharkship's 24px, to leave room for content.

### Pending

- Stage 0 sign-off and approval of the login design note.
- Final product name and logo.
- Docker Desktop for live checks.

## 2026-11-04: Planning and backend discovery

### Done

- Studied the backend in `Evoc_ships` to learn how a frontend connects to it.
- Agreed how the frontend will be built, and wrote the design spec.
- Created `Readme.md` and this document.

### Backend findings

- The gateway on port 8080 is the only part of the backend a frontend can use.
- Models and adapters aren't reachable directly. The adapter SDK is server-only and can't be used in a frontend.
- `@logicore/contracts` can be reused for form validation, but it has no API response types.
- **Available:** health, webhooks and shipment tracking. Tracking has no auth or merchant scoping.
- **Sample data only:** shipment list and stats, which work only in the gateway's mock mode.
- **Blocked:** creating a shipment always returns 503.
- **Missing from the gateway:** login, shipment detail, wallet, COD, rates, pickups and cancel.

The full route list and the gaps to raise with the backend team are in the [design spec](docs/superpowers/specs/2026-11-04-frontend-design.md).

### Decisions

| Topic | Decision |
|---|---|
| Delivery | One UI per stage, with review and sign-off before the next one |
| Scope | All screens are planned, using real data where available and labelled sample data elsewhere |
| Architecture | Next.js and TypeScript, with server code calling the gateway |
| Colours | Sharkship palette on every screen |
| Login design | `meracourierwala.com-design.md`, using image 1 as reference |
| Main dashboard design | `sharkship.in-design.md`, using image 2 as reference |
| Brand | Name and logo to be supplied; marked placeholder until then |
| Project documents | `Readme.md` and `updatesDoc.md` updated in every stage |

### Files added

- `Readme.md`
- `updatesDoc.md`
- `docs/superpowers/specs/2026-11-04-frontend-design.md`

### Verification

- Backend findings come from reading the source. **No services were run, so runtime behaviour is unconfirmed.**
- The shipment routes, CORS setup and dashboard credential handling were checked directly in the source.
- `Evoc_ships` was clean at commit `aace6033` when this work began.
- No application code exists yet, and nothing has been committed.

### Pending

- Review of the design spec, including these assumptions:
  - The app is for merchants, so support-team screens are out of scope.
  - The login uses the light layout from image 1, not the dark theme in its design file.
  - Tech choices are Tailwind, pnpm and port 3100.
- Final product name and logo.
- Docker Desktop, which isn't installed on this machine. The gateway needs it to run.
