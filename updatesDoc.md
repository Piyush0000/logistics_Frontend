# Updates

A running record of what has been done on the Evoc Logistics frontend. Newest entries come first.

## Current status

| | |
|---|---|
| **Current stage** | Full frontend build, on branch `feature/full-frontend`. Tasks 1 to 11 of 37 are done |
| **Built and merged to main** | Login, Dashboard, Orders (list, detail, create), NDR, Wallet Transactions, COD Remittance, Channel Integrations |
| **Waiting on** | Review of Task 11 |
| **Next step** | Task 12: Invoice |
| **Also needed** | Final product name and logo; real left-panel copy; terms text; Docker Desktop to test against the real gateway |

## 2026-11-10: Task 11, Wallet recharge

`/finances/wallet` has a Recharge button and a popup. `?recharge=1` opens it, and the Home quick action links there. Closing it removes `recharge=1` from the URL.

### Done

- `WalletService.startRecharge(amountPaise)`. The sample returns `{ paymentUrl: null }` and changes no balance. Gateway mode is `notAvailable()`, as the backend has no recharge route.
- Presets of ₹500, ₹1,000, ₹2,500 and ₹5,000, and a custom whole-rupee amount from ₹100 to ₹5,00,000.
- `startRechargeAction` checks the session first, then the amount on the server (10000 to 50000000 paise, multiples of 100). A payment link is only passed on if it is https; the browser then goes there. With no link the popup says "Recharge isn't connected yet. No payment was taken."
- `/finances/wallet?recharge=1` added to `e2e/routes.ts`, so dev-smoke covers the popup under `next dev`.

### Files changed

- New: `src/lib/data/wallet/recharge.ts`, `recharge.test.ts`, `src/app/(app)/finances/wallet/{actions,actions.test,recharge-dialog}.ts(x)`
- Changed: `src/lib/data/wallet/{types,mock,gateway}.ts`, wallet `page.tsx`, `e2e/wallet.spec.ts`, `e2e/gateway.spec.ts`, `e2e/routes.ts`

### Verification

| Check | Result |
|---|---|
| lint, typecheck, unit tests | 0 errors, 38 files, 362 tests passed |
| Full browser run | 606 passed, 0 failed, 35 skipped (one-size tests) |
| dev-smoke | 18 routes, `BROWSER ERRORS: none` |
| Palette, secrets, backend | No output; backend clean at aace603 |

### Not verified

- A real redirect to a payment page. It is covered by the action unit test only, as the sample never returns a link.

## 2026-11-10: Task 10, RTO

`/rto` lists shipments returning to the seller, with stage tabs (In progress, Delivered) and three summary tiles. Counts and lists use the real gateway routes.

### Done

- New `src/lib/data/rto/` (types, mock, gateway, index, tests). `rtoService()` follows `DATA_SOURCE_RTO`.
- Gateway mode: `listRto` calls the orders list function with `status=RTO_INITIATED` or `RTO_DELIVERED`; `getSummary` reads `/api/v1/shipments/stats` for the two counts. RTO charges have no source, so the tile shows "Not available yet" (`rtoChargesPaise` is `null`).
- Screen: tiles, tabs (`?stage=delivered`, in progress is the default), table on desktop and cards on phones, rows link to `/orders/<awb>`, pagination through `buildPageHref`. Empty message: "No shipments are returning."
- The list route sends no raw courier status, so `OrderSummary` got an optional `raw_status`. The mock fills it; gateway rows show "Not reported".
- The dashboard RTO tile links to `/rto` (new optional `href` on `Tile`). Sidebar RTO is live; `/rto` is in `e2e/routes.ts`.
- Stand-in gateway: `status=RTO_INITIATED` gives LIVE301, `status=RTO_DELIVERED` gives LIVE302. Other branches unchanged. `DATA_SOURCE_RTO` is on ports 3104 and 3105.

### Files changed

- New: `src/lib/data/rto/*`, `src/app/(app)/rto/{page,loading,rto-table,rto-cards}.tsx`, `e2e/rto.spec.ts`
- Changed: `src/lib/data/orders/types.ts`, `src/app/(app)/dashboard/{page,sections}.tsx`, `src/components/shell/nav-config.ts`, `e2e/{routes.ts,stub-gateway.mjs,gateway.spec.ts,dashboard.spec.ts}`, `playwright.config.ts`, `.env.example`, `Readme.md`, `updatesDoc.md`
- `e2e/dashboard.spec.ts`: the "planned items" test used RTO, which is now live. It now checks Invoice under Billings, still planned.

### Verification

| Check | Result |
|---|---|
| RED | Unit: gateway module missing. Browser: 24 failed, `/rto` did not exist |
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 330 passed |
| D2 full browser run | 592 passed, 34 skipped, 0 failed |
| D3 `node scripts/dev-smoke.mjs` | 17 routes 200 with an h1, including `/rto`. BROWSER ERRORS: none |
| D4 screenshots | Reviewed `/rto` desktop, phone and 320px images: no cut-off text, long AWB and reference wrap |
| D5 palette check | No output |
| D6 secret and brand check | No output from either grep |
| D7 backend check | `status --porcelain` empty, HEAD `aace603` |

### Not verified

- Screenshot of the gateway-mode page.

## 2026-11-10: Task 9, Connect NDR

`ndrService()` now follows `DATA_SOURCE_NDR`. In gateway mode the NDR screen, its actions and the Home tile show "This data is not available yet." The backend has no NDR route.

### Done

- New `src/lib/data/ndr/gateway.ts`: both methods return `notAvailable()`. `index.ts` picks it with `resolveDataSource('ndr')`.
- `/ndr` shows two cards (`ndr-kpis`, `ndr-list`) through `DataCard` when the result fails, with Try again. The Sample data label shows only for mock data. In gateway mode no action buttons render, so the modal cannot open.
- The NDR server action calls the service, so in gateway mode it returns the unavailable message and never reaches the mock. Pinned by a new unit test.
- Removed the Task 3 workaround in `home/page.tsx`. Home calls `ndrService().getNdrDashboard()`, and the existing port 3106 Home test still passes.
- `.env.example` comment for `DATA_SOURCE_NDR` updated.

### Files changed

- New: `src/lib/data/ndr/gateway.ts`, `src/app/(app)/ndr/actions.test.ts`
- Changed: `src/lib/data/ndr/index.ts`, `src/lib/data/ndr/ndr.test.ts`, `src/app/(app)/ndr/page.tsx`, `src/app/(app)/home/page.tsx`, `e2e/gateway.spec.ts`, `.env.example`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| RED | Unit: gateway import missing, action test failed. Browser (port 3106): `ndr-kpis` unavailable text not found |
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 322 passed |
| D2 full browser run | 566 passed, 32 skipped, 0 failed |
| D3 `node scripts/dev-smoke.mjs` | Every route 200 with an h1. BROWSER ERRORS: none |
| D4 screenshots | Reviewed `/ndr` phone image in mock mode, unchanged. Gateway view covered by the browser test |
| D5 palette check | No output |
| D6 secret and brand check | No output |
| D7 backend check | `status --porcelain` empty, HEAD `aace603` |

### Not verified

- A screenshot of the gateway-mode NDR page.

## 2026-11-10: Task 8, Pickups & Manifests

`/orders/pickups` lists shipments ready to ship (MANIFESTED), schedules a courier pickup for selected ones, lists scheduled pickups and opens a printable manifest.

### Done

- Ready to ship card with checkboxes and Select all (table on desktop, cards on phones). Schedule pickup opens a dialog with date, optional window and a saved pickup address (default preselected).
- Rules, in `src/lib/data/pickups/input.ts`: one courier per pickup (`Select shipments from one courier per pickup.`), date from today to 7 days ahead in Indian time, window end after start, 1 to 100 AWBs. The action and the mock service both check them.
- Scheduled pickups card, 10 per page, with Print manifest per row. The manifest is at `/orders/pickups/manifest-print/[id]`: signed-in only, AWB table, signature lines, `Sample manifest` banner in mock mode, buttons hidden when printing.
- Gateway mode: ready-to-ship reads `GET /api/v1/shipments?status=MANIFESTED&page=1&limit=100` through `ordersService()`. Pickups list, scheduling and the manifest are `notAvailable()`, so scheduling controls are not offered.
- Stand-in gateway list now filters on `status`: none gives the LIVE123 DELIVERED record, MANIFESTED gives LIVE201 and LIVE202, other statuses give none.
- Nav entry is live; `/orders/pickups` and a sample manifest are in `e2e/routes.ts`; `DATA_SOURCE_PICKUPS` is in `.env.example` and on ports 3104, 3105 and 3106.

### Files changed

- New: `src/app/(app)/orders/pickups/` (`page.tsx`, `loading.tsx`, `ready-to-ship.tsx`, `schedule-dialog.tsx`, `pickup-list.tsx`, `actions.ts`, `actions.test.ts`, `manifest-print/[id]/page.tsx`, `print-button.tsx`); `src/lib/data/pickups/` (types, input, format, mock, gateway, index, test); `e2e/pickups.spec.ts`
- Changed: `src/lib/data/orders/mock.ts` (one more MANIFESTED sample, DEMOEK009, so two couriers are ready), `src/components/orders/carrier-badge.tsx` (exports `carrierLabel`), `nav-config.ts`, `e2e/routes.ts`, `e2e/stub-gateway.mjs`, `e2e/gateway.spec.ts`, `playwright.config.ts`, `.env.example`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 318 passed |
| D2 full browser run | 564 passed, 31 skipped (single-size tests), 0 failed (before the final back-link fix); pickups spec re-run after it: 37 passed, 3 skipped |
| D3 `node scripts/dev-smoke.mjs` | Every route HTTP 200 with an h1, including the pickups pages. BROWSER ERRORS: none |
| D4 screenshots | Reviewed pickups (desktop, phone, 320px) and the manifest (desktop, 320px). Found the Back link unstyled, fixed and pinned by a tap-target test |
| D5 palette check | No output |
| D6 secret and brand check | No output |
| D7 backend check | `status --porcelain` empty, HEAD `aace603` |

### Decisions and not verified

- `PickupService` gained `getPickup(id)` for the manifest page.
- The manifest page does not use the app shell, so there is no sidebar to hide when printing. Unknown ids show the not-found page, but with status 200 because the loading screen starts the response first.
- Sample ready-to-ship list does not shrink after scheduling, so sample runs can keep scheduling.
- Not verified: a real print dialog (print media was emulated), and an empty ready-to-ship list in the browser (no way to produce one in sample data).

## 2026-11-10: Task 7, Bulk Upload

`/orders/bulk` lets a merchant upload a CSV of shipments, preview the valid and invalid rows, and book the valid ones through the same create path as Create Shipment.

### Done

- Template download, a `.csv` file field (up to 1 MB, 200 rows), a preview of every row with each error ("Line 3: destination pincode is invalid"), and Submit valid rows. Table on desktop, cards on phones.
- Rows book one at a time, in file order, with "Booking 3 of 12" progress. A failed row never stops the rest. The results show Booked with the AWB (or "AWB pending"), or Not booked with the reason.
- In gateway mode the stand-in answers 503, and every row shows "Booking is not available yet: Shipment creation is disabled until merchant authentication is configured". That wording now lives in one place, `bookingErrorMessage`, and Create Shipment uses it too.
- Per the controller's ruling, the browser only reads the file text. `previewBulkAction` runs on the server: it checks the session, enforces 1 MB, works out the SHA-256 key with `node:crypto` and parses the file. `crypto.subtle` is not used, because it only exists on secure origins. Each row's key is `bulk-<sha256>-<line>`, so the same file never double-books.
- `submitBulkAction` checks the session, then checks every row again with `StandardShipmentRequestSchema` and refuses bad rows one by one. It drops any `merchant_id` the browser sends.
- The template `public/samples/bulk-shipments-template.csv` has the `BULK_COLUMNS` header and one valid row. A unit test parses it, so the template and the parser cannot drift apart.
- Bulk Upload is live in the sidebar and `/orders/bulk` is in `e2e/routes.ts`.

### Found and fixed

- A 60-character reference ID (the schema allows 64) made All Shipments and B2C scroll sideways at 320px. The reference and AWB now wrap in `orders-table.tsx` and `orders-cards.tsx`. The Bulk Upload long-value test books such a row and checks `/orders` at 320px and 1024px.

### Files changed

- New: `src/app/(app)/orders/bulk/` (`page.tsx`, `loading.tsx`, `upload-form.tsx`, `row-results.tsx`, `actions.ts`, `actions.test.ts`); `src/lib/bulk-shipments.ts` and its test; `src/lib/data/orders/booking-message.ts`; `public/samples/bulk-shipments-template.csv`; `e2e/bulk.spec.ts`
- Changed: `src/app/(app)/orders/actions.ts` (uses the shared message), `src/app/(app)/orders/orders-table.tsx` and `orders-cards.tsx` (wrapping), `src/components/shell/nav-config.ts`, `e2e/routes.ts`, `e2e/gateway.spec.ts`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 289 passed |
| D2 full browser run | 520 passed, 29 skipped (single-size tests), 0 failed |
| D3 `node scripts/dev-smoke.mjs` | Every route HTTP 200 with an h1, including /orders/bulk. BROWSER ERRORS: none |
| D4 screenshots | Reviewed the empty page (desktop, phone, 320px) and the preview and results states (desktop and 360px). Table and cards align, errors wrap, nothing is cut off |
| D5 palette check | No output |
| D6 secret and brand check | No output from either grep |
| D7 backend check | `status --porcelain` empty, HEAD `aace603` |

### Decisions and not verified

- `submitBulkAction` takes `{ line, input }` rows, not bare requests, so each result can name its line.
- Line numbers count file records, with the header as line 1. A quoted cell that contains a line break would shift later numbers.
- A file near 1 MB may exceed Next.js's default 1 MB server action body limit. The screen then says "Could not read the file. Please try again." The 1 MB check itself is tested with a file just over the limit.
- Not verified: a real booking, because the gateway answers 503 until merchant authentication exists.

## 2026-11-10: Task 6, B2B Shipments

`/orders/b2b` lists multi-box business shipments and has a Create B2B shipment dialog. The backend has no B2B route, so the data is sample, and gateway mode shows it as unavailable.

### Done

- List with LR number, Consignee, Destination, Boxes, Total weight, Invoice value, Carrier, Status and Created. Table on desktop, cards on phones, search by LR number or consignee, 20 per page, and the empty message "No B2B shipments yet."
- Create dialog: consignee address checked with `AddressSchema`, a saved pickup address select, 1 to 50 box rows, a live total weight, invoice number and value, and the e-way bill note above ₹50,000. The server action checks the session first, then the input, then that the pickup address is one of the saved ones.
- Per ruling R5, the pickup-addresses data layer now exists (`src/lib/data/pickup-addresses/`): two sample addresses, `save` and `remove` with the label, 25-address and one-default rules, and a gateway service that is `notAvailable()`. Task 27 builds its screen.
- `DATA_SOURCE_B2B` and `DATA_SOURCE_PICKUP_ADDRESSES` are in `.env.example` and the port 3106 test server.
- B2B Shipments is live in the sidebar and `/orders/b2b` is in `e2e/routes.ts`.
- The create button is hidden in gateway mode, so nothing can be created against an unavailable service.

### Files changed

- New: `src/app/(app)/orders/b2b/` (`page.tsx`, `loading.tsx`, `b2b-table.tsx`, `b2b-cards.tsx`, `create-b2b-dialog.tsx`, `actions.ts`, `actions.test.ts`); `src/lib/data/b2b/` (types, totals, input, mock, gateway, index, test); `src/lib/data/pickup-addresses/` (types, mock, gateway, index, test); `e2e/b2b.spec.ts`
- Changed: `src/components/shell/nav-config.ts`, `e2e/gateway.spec.ts`, `e2e/routes.ts`, `playwright.config.ts`, `.env.example`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 267 passed |
| D2 full browser run | 490 passed, 28 skipped (single-size tests), 0 failed |
| D3 `node scripts/dev-smoke.mjs` | Every route HTTP 200 with an h1, BROWSER ERRORS: none |
| D4 screenshots (desktop, phone, 320px) | Reviewed /orders/b2b: table and cards align, the long name wraps, the large invoice stays on one line. The open dialog was not screenshotted |
| D5 palette check | No output |
| D6 secret check | Nothing in `.next/static` |
| D7 backend | status clean, HEAD aace603 |

### Decisions and not verified

- Saving the current default address as non-default keeps it default, so there is always exactly one.
- Deleting the only remaining address is allowed, because the rule only blocks deleting the default while others exist.
- The first B2B run in a shared server has desktop and phone sharing one sample store, so tests use unique names.
- The dialog is covered by browser tests, not by a screenshot review.

## 2026-11-10: Task 5, B2C Shipments

`/orders/b2c` is the shipment list scoped to single-parcel shipments. Every shipment the backend holds today is single-parcel, so in gateway mode it is the gateway list.

### Done

- New screen with the title, a description line, a "Create B2C shipment" action to `/orders/create`, the shared filters, the table on desktop and cards on phones, in a card with its own sample label and error with Try again. Empty message: "No B2C shipments match these filters."
- URL input is parsed with `url-params`: a bad `page`, `status` or `carrier` is ignored and search is cut to 100 characters, so the page never errors.
- Gateway mode adds the note "Search covers the shipments on this page only." when a search is active.
- `filters.tsx` now pushes to the current path instead of a fixed `/orders` (the only change to it), so the same filters work on both screens.
- B2C Shipments is live in the sidebar. All Shipments is not marked current on this page.

### Files changed

- New: `src/app/(app)/orders/b2c/page.tsx`, `loading.tsx`; `e2e/b2c.spec.ts`
- Changed: `src/app/(app)/orders/filters.tsx`, `src/components/shell/nav-config.ts`, `nav-config.test.ts`, `e2e/gateway.spec.ts`, `e2e/routes.ts`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 243 passed |
| D2 full browser run | 463 passed, 26 skipped (single-size tests), 0 failed |
| D3 `node scripts/dev-smoke.mjs` | Every route HTTP 200 with an h1, BROWSER ERRORS: none |
| D4 screenshots (desktop, phone, 320px) | Reviewed /orders/b2c. The filter bar still has its own "Create Shipment" button beside the header's "Create B2C shipment" |
| D5 palette check | No output |
| D6 secret check | Nothing in `.next/static` |
| D7 backend | status clean, HEAD aace603 |

### Decisions and not verified

- The filter bar's own "Create Shipment" button was left as is, because the filters file may change only to use the current path.
- The wrap test uses a long email and a 100-character search. There is no long AWB in the sample data, so that case is not covered.

## 2026-11-10: Task 4, connect All Shipments, Shipment Detail and Create Shipment

Create Shipment now posts to the gateway in gateway mode, and the shipment page shows the live tracking timeline.

### Done

- Creating a shipment posts to `POST /api/v1/shipments` with the merchant credential and no `merchant_id`. A 202 becomes a result with no AWB yet. The gateway answers 503 today, so the form shows "Booking is not available yet: <gateway message>" and keeps every field the merchant typed.
- The success screen shows "AWB will appear once the courier confirms." when there is no AWB. Mock mode still returns an AWB and looks the same.
- The form keeps one idempotency key for the life of the page and sends it as a hidden field, so a retry after a failure reuses it. The key is made on the server per page load.
- The shipment page loads its timeline from the tracking route (`trackingService().getTimeline`), newest event first, in its own card with its own error and Try again. Shipment facts (addresses, items) stay sample data in gateway mode, because the gateway has no detail route. A shipment the gateway knows but the sample data does not shows its AWB, status, carrier and timeline, and says address and package details are not available yet.
- The sample label on the shipment and create pages now shows only when that data is sample data.
- Stand-in gateway: POST answers 503 with the real message, and LIVE123 has a second, older event (In transit, Pune).

### Files changed

- Changed: `src/lib/data/orders/gateway.ts`, `types.ts`, `orders.test.ts`; `src/lib/data/tracking/` (`gateway.ts`, `mock.ts`, `types.ts`, `index.ts`, new `tracking.test.ts`); `src/lib/gateway/schemas/shipments.ts`, `orders.ts`; `src/app/(app)/orders/[id]/page.tsx`, `orders/create/create-form.tsx`, `orders/create/page.tsx`, `orders/actions.ts`; `e2e/orders.spec.ts`, `e2e/gateway.spec.ts`, `e2e/stub-gateway.mjs`; `.env.example`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| Unit tests before the code | 5 failed, functions missing |
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 242 passed |
| D2 full browser run | 443 passed, 25 skipped (single-size tests), 0 failed. An earlier run under heavy machine load had 2 timeouts, both passing on rerun |
| D3 `node scripts/dev-smoke.mjs` | Every route HTTP 200 with an h1, BROWSER ERRORS: none |
| D4 screenshots (desktop, phone, 320px) | Reviewed /orders/DEMOEK001 and /orders/create. The timeline card title is a little larger than the other card titles, as it uses the shared card |
| D5 palette check | No output |
| D6 secret and brand check | No output |
| D7 backend check | Clean, HEAD aace603 |

### Decisions

- `createShipment` result `awb` is `string | null`. The mock still returns a string.
- The existing shipment-page test now uses `.first()` on "Sample data", because the timeline card shows its own badge in mock mode.
- The create page and form take the idempotency key as a prop made on the server, because making it in the browser caused a hydration mismatch or a lint error.
- The success link for a booking with no AWB goes to All Shipments, with no prefetch.

### Not verified

- Booking against a real backend: the gateway has no merchant authentication yet, so the 202 mapping is tested only against the stand-in and unit tests.

## 2026-11-10: Task 3, Home

The Home screen is built at `/home`: greeting, four quick actions, four stat tiles, a setup checklist and the five latest shipments. Home is now live in the sidebar.

### Done

- Greeting "Welcome, <name>", from the signed-in email.
- Quick actions to Create Shipment, Track a Shipment, Recharge Wallet (`/finances/wallet?recharge=1`) and Rate Calculator. Two per row on phones, four across on desktop.
- Tiles: Wallet Balance, In Transit, NDR Action Required, Delivered. Each tile has its own data source, so one failure shows its error in that tile only.
- "Get started" checklist with "2 of 4 done" and a link per step, and "Recent shipments" with five rows linking to `/orders/<awb>`, or "No shipments yet." with "Create your first shipment".
- New data feature `src/lib/data/onboarding/`. Gateway mode returns "not available", as the backend has no route. `DATA_SOURCE_ONBOARDING` is in `.env.example` and the port 3106 test server.
- In gateway mode the NDR tile is shown as unavailable, because NDR has no gateway route.
- Sign-in still lands on `/dashboard`. Home is reached from the sidebar.

### Files changed

- New: `src/app/(app)/home/` (`page.tsx`, `loading.tsx`, `quick-actions.tsx`, `onboarding-checklist.tsx`, `recent-shipments.tsx`, `stat-card.tsx`), `src/lib/data/onboarding/` (types, mock, gateway, index, test), `e2e/home.spec.ts`
- Changed: `src/components/shell/nav-config.ts` (Home live), `e2e/routes.ts`, `e2e/gateway.spec.ts` (3 Home tests), `e2e/dashboard.spec.ts` (sidebar test now checks Reports, not Home, as the disabled example), `playwright.config.ts`, `.env.example`, `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| Unit tests before the code | Failed, modules missing |
| Home browser tests before the page | 8 failed, as expected |
| D1 lint, typecheck, unit tests | 0 errors, 0 warnings, 236 passed |
| D2 full browser run | 438 passed, 25 skipped (single-size tests), 0 failed |
| D3 `node scripts/dev-smoke.mjs` | /home HTTP 200, h1 Home, BROWSER ERRORS: none |
| D4 screenshots (desktop, phone, 320px) | Reviewed. Found the wallet amount and "Rate Calculator" splitting mid-word at 320px, fixed, and pinned by a test |
| D5 palette check | No output |
| D6 secret and brand check | No output |
| D7 backend check | Clean, HEAD aace603 |

### Decisions

- Links to screens that do not exist yet (Rate Calculator, tracking, Company, Pickup Addresses) do not prefetch. Their prefetch never finishes, which kept the page from ever going quiet in browser tests.
- Tests check the link addresses, not the destinations, which come in Tasks 16, 17, 25 and 27.
- The Recharge link's `recharge=1` is ignored until Task 11.

### Not verified

- Gateway mode with a real backend, as before.

## 2026-11-10: Task 2, new sidebar menu and shared building blocks

The sidebar now shows the menu from the new reference, with sub-menus, in the existing blue style. Shared parts for the coming screens are in place.

### Done

- `src/components/shell/nav-config.ts` holds the menu (`NAV`): Home, Dashboard, Shipping Management, Operations, Billings, Reconciliation, Tools, Reports, Settings and Help & Support, with every route from the navigation map. Live today: Dashboard, All Shipments, Create Shipment, NDR, Wallet Transactions and COD Remittance. Everything else is `planned`: greyed out, with "<name> is not available yet".
- The sidebar renders `NAV`. Groups with sub-pages open and close. The group holding the current page starts open, and on `/dashboard` all are closed. Clicking a group icon in the collapsed rail opens the rail with that group showing. The collapse button, phone menu, user row and widths are unchanged.
- `/orders` stays marked for an order's detail page, but not for Create Shipment. Settings owns `/channel-integrations`, but nothing is marked there until Settings is built in Task 24.
- New shared parts in `src/components/ui/`: `PageHeader`, `DataCard`, `EmptyState`, `StatTile`, `Pagination`. `dialog.tsx`, `select-field.tsx`, `date-field.tsx` and `field-styles.ts` moved there with the same exports.
- `src/lib/url-params.ts` parses `page`, `limit`, enum and text URL parameters safely. `src/lib/csv.ts` builds CSV files, and the COD export now uses it with the same output.
- Test tools: `e2e/screen-checks.ts` (sizes, tap targets, signed-out redirect), `e2e/routes.ts` (every route), `scripts/dev-smoke.mjs` (every route under `next dev`, failing on any browser error) and `scripts/screenshots.mjs`.
- `Readme.md`: new commands, code layout, sidebar menu, and a short "Adding a screen" note.

### Files changed

- New: `src/components/shell/nav-config.ts`, `nav-config.test.ts`, `src/components/ui/page-header.tsx`, `data-card.tsx`, `empty-state.tsx`, `stat-tile.tsx`, `pagination.tsx`, `src/lib/url-params.ts`, `url-params.test.ts`, `src/lib/csv.ts`, `e2e/screen-checks.ts`, `e2e/routes.ts`, `scripts/dev-smoke.mjs`, `scripts/screenshots.mjs`
- Moved: `channel-integrations/dialog.tsx`, `finances/wallet/select-field.tsx`, `date-field.tsx`, `field-styles.ts` to `src/components/ui/`, with import lines updated in the 10 files that use them
- Changed: `src/components/shell/sidebar.tsx`, `src/lib/data/cod/csv.ts`, `e2e/dashboard.spec.ts`, `e2e/stub-gateway.mjs` (unused parameter only), `Readme.md`, `updatesDoc.md`

### Verification

| Check | Result |
|---|---|
| New unit tests before the code | Failed, modules missing |
| New sidebar browser tests before the code | 10 failed, as expected |
| `pnpm lint` | 0 errors, 0 warnings, after removing the unused `_url` parameter in `e2e/stub-gateway.mjs` (fix round 1). Gateway project re-run: 14 passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | 233 of 233 passed (24 test files) |
| `pnpm build && pnpm test:e2e` | 413 passed, 23 skipped, 0 failed. Wallet, COD and Channel Integrations specs passed unchanged |
| `node scripts/dev-smoke.mjs` | 10 routes, all HTTP 200 with an h1, `BROWSER ERRORS: none` |
| Screenshots | All 10 routes at desktop, phone and 320px, plus the sidebar open, reviewed |
| Colours outside palette | None |
| Secrets in `.next/static` | None |
| Brand names in `src` | Only design-file comments |
| `Evoc_ships` | Clean, at `aace603` |

### Decisions

- At 320px the phone menu is 269px wide, so "Shipping Management" is cut short with an ellipsis. Its full name is still read out.
- `DataCard` reuses the dashboard's `RetryButton`, which stays in `src/app/(app)/dashboard/`.
- In Git Bash, `scripts/screenshots.mjs` needs `MSYS_NO_PATHCONV=1` before route arguments, and says so if it's missing.

## 2026-11-10: Task 1, sync fixes after the merges

Fixed small inconsistencies found in the 2026-11-09 check of the three merged pull requests.

### Done

- The wallet amount in the top bar now links to `/finances/wallet`.
- The Orders tab "RTO" is now two tabs: "RTO in progress" (`RTO_INITIATED`) and "RTO delivered" (`RTO_DELIVERED`).
- With the gateway as the source and a search set, Orders says "Search covers the shipments on this page only.", because the gateway list has no search parameter.
- `.env.example` lists `DATA_SOURCE_ORDERS` and `DATA_SOURCE_NDR`.
- `Readme.md` marks the merged screens "Merged to main" and lists `DATA_SOURCE_ORDERS`.
- The design spec has a new section 11, "Navigation and scope addendum (2026-11-10)", with the decisions, navigation map and backend table.
- Tests: wallet link, RTO tabs and the search note. The stand-in gateway now answers `GET /api/v1/shipments` with one `LIVE123` record, and `DATA_SOURCE_ORDERS` is in `gatewayData`.
- The two older Orders tests now ask for the "Delivered" tab by its exact name, because "RTO delivered" also contains that word. They check the same things as before.

### Files changed

`src/components/shell/top-bar.tsx`, `src/app/(app)/orders/filters.tsx`, `src/app/(app)/orders/page.tsx`, `.env.example`, `Readme.md`, `updatesDoc.md`, `docs/superpowers/specs/2026-11-04-frontend-design.md`, `playwright.config.ts`, `e2e/stub-gateway.mjs`, `e2e/dashboard.spec.ts`, `e2e/orders.spec.ts`, `e2e/gateway.spec.ts`

### Verification

| Check | Result |
|---|---|
| New tests before the fix | 5 failed, as expected |
| `pnpm lint`, `pnpm typecheck` | Passed |
| `pnpm test` | 221 of 221 passed (22 test files) |
| `pnpm build && pnpm test:e2e` | First run: 402 passed, 22 skipped, 4 failed (the two Orders tests above, ambiguous tab name). After the fix, `e2e/orders.spec.ts` alone: 59 passed, 1 skipped. Gateway project passed in the full run |
| Colours outside palette | None |
| Secrets in `.next/static` | None |
| Brand names in `src` | Only design-file comments |
| `Evoc_ships` | Clean, at `aace603` |

**Not run:** `scripts/dev-smoke.mjs` and `scripts/screenshots.mjs` do not exist yet. Task 2 creates them. The full e2e suite was not re-run after the two-line test fix.

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
