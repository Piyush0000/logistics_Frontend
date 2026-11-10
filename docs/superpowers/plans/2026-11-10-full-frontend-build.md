# Evoc Logistics Full Frontend Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every remaining screen and feature of the Evoc Logistics merchant frontend, connect each one to the `Evoc_ships` gateway wherever a route exists, and leave room to add more screens later, without changing the backend or breaking a built screen.

**Architecture:** Next.js App Router. Server code calls only the gateway, through `src/lib/gateway/client.ts`. Every feature has a `mock` and a `gateway` service behind one interface, selected by `DATA_SOURCE_<FEATURE>`. Navigation comes from one config file, so a future screen is one entry plus one route folder.

**Tech Stack:** Next.js 16.4.5, React 19.3.1, TypeScript 5.9.3, Tailwind 4.3.4, zod 3.25.76, lucide-react 1.68.0, Vitest 5.1.0, Playwright 1.64.1, pnpm 9.15.0, Node 22.12 or newer.

**Spec:** `docs/superpowers/specs/2026-11-04-frontend-design.md`, extended by the **Decisions** section below. Task 1 copies those decisions into the spec as an addendum.

## Global Constraints

- `D:\EvocLogistics\Evoc_ships` gets no changes. Before and after every task, `git -C ../Evoc_ships status --porcelain` prints nothing and `git -C ../Evoc_ships rev-parse --short HEAD` prints `aace603`.
- Colours come only from the Sharkship palette in `src/app/globals.css`: `#184FA2`, `#E5E5E5`, `#FAFAFA`, `#FFFFFF`, `#0A0A0A`, `#184FA21A`, `#2EA8E6`, `#22C55E`, `#F59E0B`, `#EF4444`. Tailwind's default colours are removed, so only these tokens and their opacity variants exist.
- Signed-in screens use `theme-app` and follow `sharkship.in-design.md`. Sign-in screens use `theme-auth` and follow `meracourierwala.com-design.md`.
- Every screen works from 320px to 1920px wide, with no sideways page scroll at 320x568, 360x640, 390x844, 844x390, 768x1024, 1024x768, 1366x768 and 1920x1080.
- On phones, every tap target is at least 44px tall and form text is 16px.
- Only server code calls the gateway. No token or `GATEWAY_URL` uses a `NEXT_PUBLIC_` name, and none appears in `.next/static`.
- Every data result is a `DataResult<T>` from `src/lib/data/source.ts`. A mock result shows `<SampleBadge />`.
- A feature with no gateway route uses `notAvailable()` from `src/lib/data/not-available.ts` in gateway mode, so sample data never passes as real data.
- Every server action and route handler checks `getDemoSession()` before touching data, and returns an error, not data, when signed out.
- Money is integer paise, shown with `formatPaise`. Dates use `src/lib/format/date.ts`, in Asia/Kolkata time.
- Merchant input sent to the gateway never includes `merchant_id`. Shipment creation reuses its `idempotency_key` on retry.
- No new runtime dependency. Charts are inline SVG.
- Reference brand names, logos and figures from the images are never copied. The brand is the placeholder in `src/components/brand-mark.tsx`.
- Existing URLs stay the same: `/dashboard`, `/orders`, `/orders/create`, `/orders/[id]`, `/ndr`, `/finances/wallet`, `/finances/cod`, `/channel-integrations`, `/login`, `/terms`.
- A built screen changes only where its task's **Modify** list says so. Every changed file is covered by the existing tests, which must still pass.
- Each screen is finished and fully tested before the next starts, with no pause for approval between screens.
- `Readme.md` and `updatesDoc.md` are updated in the same task as the work, and record only verified results.
- Work happens on branch `feature/full-frontend`, with one local commit per task. Nothing is pushed: the team merges to `main`.

## Review Focus

These five input classes are the most likely to hurt a real merchant while being missed by happy-path tests. Each is pinned by a test in the **Screen Delivery Procedure**, so every screen task owns those tests for its own screen.

1. **Long values at 320px:** long emails, 20-character AWBs, ₹1,00,00,000.00 amounts and long city names must wrap or truncate, never widen the page. Each screen test fills its sample data with a long value and checks there is no sideways scroll.
2. **Empty lists:** a merchant with no rows sees a plain message and the next action, not a blank card or a crash. Each list screen tests its empty state through a filter that matches nothing.
3. **Backend down or slow on a mixed page:** when one source fails, only its card shows the error with Try again, and the rest of the page still works. Each screen with a gateway route gets a test on port 3105 (nothing listening).
4. **Signed-out access:** every new route, server action and route handler refuses a signed-out caller. The public tracking page shows no address, phone or name. Each task tests its own entry points while signed out.
5. **Bad URL input:** `?page=abc`, `?page=-1`, `?status=FOO`, unknown IDs and over-long search text never crash a page. Each screen tests one of each that its URL accepts.

---

## Decisions

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

---

## Files

New shared units, created in Tasks 1–2 and used by every later task:

| File | Responsibility |
|---|---|
| `src/components/shell/nav-config.ts` | The menu: groups, items, routes and `live`/`planned` status. The only file a future screen edits to appear in the sidebar |
| `src/components/ui/page-header.tsx` | Title, optional description and actions row, used by every new screen |
| `src/components/ui/data-card.tsx` | Card that renders a `DataResult`: sample badge, error with Try again, or content |
| `src/components/ui/empty-state.tsx` | Message plus optional action for empty lists |
| `src/components/ui/stat-tile.tsx` | Icon, label and value tile |
| `src/components/ui/dialog.tsx` | Moved from `src/app/(app)/channel-integrations/dialog.tsx`, with its exports unchanged |
| `src/components/ui/select-field.tsx`, `date-field.tsx`, `field-styles.ts` | Moved from `src/app/(app)/finances/wallet/`, with their exports unchanged |
| `src/components/ui/pagination.tsx` | Previous and next page links that keep the other URL parameters |
| `src/components/charts/bar-chart.tsx` | Inline SVG bar chart, created in Task 20 |
| `src/lib/url-params.ts` | Safe parsing of `page`, `limit`, enum and text URL parameters |
| `src/lib/csv.ts` | CSV building, generalised from `src/lib/data/cod/csv.ts`. The COD file re-exports it unchanged |
| `e2e/screen-checks.ts` | Shared browser checks: `SIZES`, `expectNoSidewaysScroll`, `expectTapTargets`, `expectSignedOutRedirect` |
| `e2e/routes.ts` | Every app route, used by the dev-mode check and screenshots |
| `scripts/dev-smoke.mjs` | Opens every route under `next dev` on port 3107 and fails on any browser error |
| `scripts/screenshots.mjs` | Saves desktop and phone screenshots of given routes to `test-results/screenshots/` |

Each new feature follows the existing data pattern:

```
src/lib/data/<feature>/types.ts    interface <Feature>Service and its data types
src/lib/data/<feature>/mock.ts     mock<Feature>Service, using fromMock()
src/lib/data/<feature>/gateway.ts  gateway<Feature>Service, using gatewayFetch() or notAvailable()
src/lib/data/<feature>/index.ts    <feature>Service(): picks one with resolveDataSource('<feature>')
src/lib/data/<feature>/<feature>.test.ts
```

Mocks that accept changes keep them in module memory for the life of the server process, as `src/lib/data/ndr/mock.ts` already does. That means they reset on restart and are never shared between servers.

Each new screen follows the existing page pattern:

```
src/app/(app)/<route>/page.tsx     server: getDemoSession() or redirect('/login'),
                                   load walletService().getBalance() for <AppShell>, load screen data
src/app/(app)/<route>/loading.tsx  skeleton blocks with role="status"
src/app/(app)/<route>/*.tsx        client parts, one responsibility per file
src/app/(app)/<route>/actions.ts   server actions, each starting with the session check
e2e/<screen>.spec.ts               browser tests for desktop and phone
```

---

## Screen Delivery Procedure

Every screen task, from Task 3 to Task 36, runs these five parts in order. A part is done only when its checks pass.

1. **Screen:** build the layout, with sample data and every state.
2. **Features:** add what the screen does.
3. **Connection:** wire it to the backend.
4. **Verification:** test everything, including what the screen might break.
5. **Docs and commit.**

The task sections below list only each screen's specifics: routes, files, interfaces, contents, connection and its named tests. Write tests first in every part, run them, and see them fail for the expected reason before writing code.

**Part A: Screen (layout and states)**
- [ ] A1. Before designing the first screen of a session, load the `frontend-design` skill. Read `sharkship.in-design.md` (or `meracourierwala.com-design.md` for sign-in screens), and look at the nearest built screen for patterns.
- [ ] A2. Write the screen's types and mock service, with the unit tests named in the task. Run `pnpm exec vitest run src/lib/data/<feature>` and confirm they fail, then implement until they pass.
- [ ] A3. Write `e2e/<screen>.spec.ts` with the task's screen tests. Every screen spec includes these, for both projects:
  - `shows the page title and sample label`: the title is the h1, and `Sample data` is visible on every mock card.
  - `does not scroll sideways at any size`: `expectNoSidewaysScroll(page, SIZES)`.
  - `keeps tap targets touch-sized on phones`: `expectTapTargets` on the screen's buttons, links and fields (phone project only).
  - `wraps long values`: uses the task's long sample row, then checks for no sideways scroll at 320x568.
  - `sends signed-out visitors to login`: `expectSignedOutRedirect(page, '<route>')`.
  - `shows an empty state`: for list screens, a filter or search that matches nothing shows the task's empty message.
- [ ] A4. Run `pnpm build && pnpm exec playwright test e2e/<screen>.spec.ts --project=desktop --project=phone`. The new tests should fail.
- [ ] A5. Build `page.tsx`, `loading.tsx` and the layout components, using `PageHeader`, `DataCard`, `EmptyState` and `StatTile`. Lists are tables on desktop and cards on phones, as `src/app/(app)/orders/orders-table.tsx` and `orders-cards.tsx` already do.
- [ ] A6. Flip the screen's entry in `nav-config.ts` from `planned` to `live`.
- [ ] A7. Re-run the command from A4. The screen tests should now pass.

**Part B: Features**
- [ ] B1. Write the task's feature tests: unit tests for pure logic, browser tests for interactions. Every screen whose URL takes parameters also gets `ignores bad URL input`, which opens `?page=abc`, `?page=-1`, any task-specific enum with `FOO`, and a 300-character `q`, and expects the page to render page 1 with no error.
- [ ] B2. Run them and confirm they fail.
- [ ] B3. Implement the features. Parse URL parameters with `src/lib/url-params.ts`. Server actions start with `if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' }`, using each action's own result type.
- [ ] B4. Re-run them and confirm they pass. Add `refuses a signed-out caller` for every new server action, as a unit test in the style of `src/app/(app)/channel-integrations/actions.test.ts`.

**Part C: Connection**
- [ ] C1. Write the gateway service tests in `src/lib/data/<feature>/<feature>.test.ts`, using a local HTTP server as `src/lib/data/dashboard-data.test.ts` does.
  - **When a route exists:** test the exact path and query, the `Authorization: Bearer` header, response mapping, and the error kinds the route can return.
  - **When no route exists:** test that the gateway service returns `{ ok: false, source: 'gateway', error: { kind: 'unavailable' } }`.
- [ ] C2. Write the screen's `e2e/gateway.spec.ts` block.
  - **When a route exists:** the screen on port 3104 shows stand-in data with no sample label, and on port 3105 the card shows `Could not reach the server. Please try again.` with Try again while the rest of the page works.
  - **When no route exists:** on port 3106 the card shows `This data is not available yet.`, Try again, and no sample label.
- [ ] C3. Extend `e2e/stub-gateway.mjs` with the task's stand-in responses, copying response shapes from the `Evoc_ships` source the task names. Add the feature's variable to `gatewayData` (route exists) or to the port 3106 `env` (no route) in `playwright.config.ts`.
- [ ] C4. Implement `gateway.ts` and `index.ts`. Add the variable to `.env.example`, with a one-line comment saying whether the gateway has the route.
- [ ] C5. Run `pnpm exec vitest run src/lib/data/<feature> && pnpm build && pnpm exec playwright test --project=gateway`. Everything should pass, including the earlier gateway tests.

**Part D: Verification**

Run every check in D1–D7. A failure in a screen that was already built means this task broke it. Fix that before moving on, and never weaken the older test.

- [ ] D1. `pnpm lint && pnpm typecheck && pnpm test`. Expected: 0 errors, 0 warnings, all tests pass.
- [ ] D2. `pnpm build && pnpm test:e2e`. Expected: `0 failed`. Skipped tests are only those limited to one screen size.
- [ ] D3. `node scripts/dev-smoke.mjs`. Expected: every route loads with HTTP 200, a visible h1, and `BROWSER ERRORS: none`. It catches problems that only appear under `next dev`, such as React mounting components twice.
- [ ] D4. `node scripts/screenshots.mjs <route>` and open the desktop, phone and 320px images. Compare against the design file and neighbouring screens: alignment, spacing, cut-off text, wrapping, and balance at phone size. Fix anything found, add a test that pins it, and repeat D2.
- [ ] D5. Palette check: `grep -rnoiE '#[0-9a-f]{3,8}\b' src --include=*.tsx --include=*.ts --include=*.css | grep -v '\.test\.' | grep -viE '#(184fa2|e5e5e5|fafafa|ffffff|0a0a0a|184fa21a|2ea8e6|22c55e|f59e0b|ef4444)\b'`. Expected: no output.
- [ ] D6. Secret and brand check:
  - `grep -rlE 'demo-merchant|DEV_SHIPMENTS_TOKEN|DEV_WEBHOOK_TOKEN|GATEWAY_URL' .next/static` prints nothing.
  - `grep -rniE 'courier ?wala|sharkship|jeetendra|festive|surcharge' src` prints only design-file comments.
- [ ] D7. Backend check: `git -C ../Evoc_ships status --porcelain` prints nothing, and `rev-parse --short HEAD` prints `aace603`.

**Part E: Docs and commit**
- [ ] E1. In `Readme.md`, update:
  - the screen table: the route and "Done";
  - the data-source table, if a variable was added;
  - the code layout, if a new folder was added.
- [ ] E2. In `updatesDoc.md`, add a dated entry at the top: what was done, files, a verification table with the real numbers from D1–D7, decisions, and anything not verified. Update the Current status block.
- [ ] E3. Commit:

```bash
git add -A
git commit -m "feat(<screen>): <screen name> screen, features and backend connection"
```

---

## Phase 0: Sync and foundations

### Task 1: Sync fixes found in the 2026-11-09 check

**Files:**
- Modify: `src/components/shell/top-bar.tsx` (wallet amount links to `/finances/wallet`)
- Modify: `src/app/(app)/orders/filters.tsx` (RTO tabs)
- Modify: `src/app/(app)/orders/page.tsx` (search-scope note)
- Modify: `.env.example`, `Readme.md`, `updatesDoc.md`, `docs/superpowers/specs/2026-11-04-frontend-design.md` (Decisions addendum)
- Test: `e2e/dashboard.spec.ts`, `e2e/orders.spec.ts`

**Interfaces:**
- Consumes: the existing `Wallet` component in `top-bar.tsx`, the `TABS` list in `orders/filters.tsx`, and the result `source` in `orders/page.tsx`.
- Produces: no new interfaces.

- [ ] **Step 1: Write the failing tests**
  - In `e2e/dashboard.spec.ts`, add `opens the wallet from the top bar balance`: click `getByTestId('wallet')` and expect the URL to end with `/finances/wallet`.
  - In `e2e/orders.spec.ts`, add `separates RTO in progress from RTO delivered`: the tab `RTO in progress` sets `status=RTO_INITIATED`, and the tab `RTO delivered` sets `status=RTO_DELIVERED`.
- [ ] **Step 2: Run them**
  Run: `pnpm build && pnpm exec playwright test e2e/dashboard.spec.ts e2e/orders.spec.ts -g "wallet from the top bar|RTO in progress"`. Expected: both fail.
- [ ] **Step 3: Implement**
  - Wrap the balance in `<Link href="/finances/wallet">`, keeping `data-testid="wallet"` and its classes.
  - Replace the `{ label: 'RTO', value: 'RTO_INITIATED' }` tab with `RTO in progress` / `RTO_INITIATED` and `RTO delivered` / `RTO_DELIVERED`.
  - When the list result's `source` is `gateway` and `search` is set, show `Search covers the shipments on this page only.` above the list, because the gateway list has no search parameter.
- [ ] **Step 4: Add a test for the search note**
  In `e2e/gateway.spec.ts`, add `says gateway search covers this page only` (port 3104, `/orders?search=LIVE`). This needs `DATA_SOURCE_ORDERS` in `gatewayData` and a stand-in `GET /api/v1/shipments` returning `{ items: [one LIVE123 record], page: 1, limit: 50, total: 1 }`, matching `ShipmentListResponseSchema` in `src/lib/gateway/schemas/orders.ts`.
- [ ] **Step 5: Update the docs**
  - `.env.example`: add `DATA_SOURCE_ORDERS` ("route exists, mock mode only") and `DATA_SOURCE_NDR` ("no route").
  - `Readme.md`: mark merged screens "Merged to main".
  - `updatesDoc.md`: correct the Current status to list every built screen, and add this task's entry.
  - The spec: append the Decisions section as "11. Navigation and scope addendum (2026-11-10)".
- [ ] **Step 6: Verify and commit**
  Run Procedure Part D, then commit `fix: sync wallet link, RTO tabs, gateway search note and docs after merges`.

### Task 2: Navigation config, sub-menus and shared building blocks

**Files:**
- Create: `src/components/shell/nav-config.ts`, `src/components/shell/nav-config.test.ts`
- Create: `src/components/ui/page-header.tsx`, `data-card.tsx`, `empty-state.tsx`, `stat-tile.tsx`, `pagination.tsx`
- Move, keeping exports unchanged:
  - `src/app/(app)/channel-integrations/dialog.tsx` to `src/components/ui/dialog.tsx`
  - `src/app/(app)/finances/wallet/select-field.tsx`, `date-field.tsx` and `field-styles.ts` to `src/components/ui/`
  - Update only their import lines in the files that use them.
- Create: `src/lib/url-params.ts`, `src/lib/url-params.test.ts`
- Create: `src/lib/csv.ts`, and change `src/lib/data/cod/csv.ts` to re-export from it
- Modify: `src/components/shell/sidebar.tsx` (render from `NAV`)
- Create: `e2e/screen-checks.ts`, `e2e/routes.ts`, `scripts/dev-smoke.mjs`, `scripts/screenshots.mjs`
- Modify: `e2e/dashboard.spec.ts` (sidebar tests use the new labels)

**Interfaces:**
- Produces, in `nav-config.ts`:

```ts
export type NavStatus = 'live' | 'planned';
export interface NavItem { label: string; href: string; status: NavStatus; icon: LucideIcon }
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  href?: string;           // single-link groups: Home, Dashboard, Reports, Settings
  status?: NavStatus;      // single-link groups only
  children?: NavItem[];
  /** Extra path prefixes that mark this group active, e.g. Settings owns /channel-integrations. */
  alsoActiveFor?: string[];
  dividerBefore?: boolean;
}
export const NAV: NavGroup[];
export function isActivePath(href: string, pathname: string): boolean;
export function activeGroupLabel(pathname: string): string | null;
```

- Produces, in `src/components/ui/`:
  - `PageHeader({ title, description?, actions? })`
  - `DataCard<T>({ testId, title, result, actions?, children: (data: T) => ReactNode })`: renders `SampleBadge` for mock results, and for errors the error message (with `Sign in again to see this data.` for `unauthorized`) plus `RetryButton`, with the same behaviour as `DetailCard` in `src/app/(app)/dashboard/sections.tsx`.
  - `EmptyState({ message, action?: { label, href } })`
  - `StatTile({ label, value, icon, testId? })`
  - `Pagination({ page, pageCount, buildHref: (page: number) => string })`
- Produces, in `url-params.ts`:
  - `parsePage(value: unknown): number`: integer of 1 or more, else 1.
  - `parseLimit(value: unknown, allowed: readonly number[], fallback: number): number`
  - `parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined`
  - `parseText(value: unknown, max = 100): string`: trimmed and cut to `max`.
- Produces, in `e2e/screen-checks.ts`:
  - `SIZES`: the 8 sizes in Global Constraints.
  - `expectNoSidewaysScroll(page, sizes)`
  - `expectTapTargets(page, locators)`: each at least 44px tall.
  - `expectSignedOutRedirect(page, route)`: opens the route in a fresh context and expects `/login`.

`NAV` contents, in order, using the routes from the navigation map:

| Group | Icon | Children (label, status) |
|---|---|---|
| Home | `House` | link, `planned` until Task 3 |
| Dashboard | `LayoutDashboard` | link, `live` |
| Shipping Management (divider before) | `ShoppingCart` | All Shipments `live`, B2C Shipments `planned`, B2B Shipments `planned`, Create Shipment `live`, Bulk Upload `planned`, Pickups & Manifests `planned` |
| Operations | `ArrowLeftRight` | NDR `live`, RTO `planned` |
| Billings (divider before) | `Banknote` | Wallet Transactions `live`, COD Remittance `live`, Invoice `planned` |
| Reconciliation | `Scale` | Weight `planned`, Weight Settings `planned` |
| Tools (divider before) | `BriefcaseBusiness` | Rate Card `planned`, Rate Calculator `planned`, Order Tracking `planned` |
| Reports | `FileChartColumn` | link, `planned` |
| Settings | `Settings` | link, `planned`; `alsoActiveFor: ['/channel-integrations', '/settings']` |
| Help & Support | `CircleHelp` | Support Tickets `planned`, Help Centre `planned` |

- [ ] **Step 1: Write the failing unit tests in `nav-config.test.ts` and `url-params.test.ts`**
  - `every live link points at an existing page`: for each `live` href, `src/app/(app)` or `src/app/(public)` contains a matching `page.tsx` (strip the leading `/` and check the folder with `fs.existsSync`).
  - `marks All Shipments active for an order detail page`: `activeGroupLabel('/orders/DEMOEK001')` returns `'Shipping Management'`.
  - `keeps Create Shipment separate from All Shipments`: `isActivePath('/orders', '/orders/create')` returns `false`.
  - `marks Settings active on Channel Integrations`: `activeGroupLabel('/channel-integrations')` returns `'Settings'`.
  - `parsePage`: `'abc'` → 1, `'-1'` → 1, `'2.5'` → 1, `'3'` → 3.
  - `parseEnum('FOO', ['A'])` returns `undefined`.
  - `parseText` with 300 characters returns 100.
- [ ] **Step 2: Run them**
  Run: `pnpm exec vitest run src/components/shell src/lib/url-params.test.ts`. Expected: they fail because the modules are missing.
- [ ] **Step 3: Implement `nav-config.ts` and `url-params.ts` to the interfaces above**
  `isActivePath` matches the exact href or `href + '/'`, except that `/orders` does not claim the static child routes listed in `NAV`.
- [ ] **Step 4: Run the unit tests**
  Expected: PASS.
- [ ] **Step 5: Update the sidebar browser tests in `e2e/dashboard.spec.ts`**
  - `lists every group from the new menu`: group labels Home, Dashboard, Shipping Management, Operations, Billings, Reconciliation, Tools, Reports, Settings, Help & Support.
  - `opens the group for the current page`: on `/dashboard` every group is collapsed. On `/finances/wallet`, Billings has `aria-expanded="true"`, and `Wallet Transactions` has `aria-current="page"`.
  - `expands and collapses a group`: clicking `Operations` toggles `aria-expanded`, and its links show and hide.
  - `opens the rail and the group from a collapsed icon`: on desktop, clicking the collapsed Billings icon widens the sidebar to 320px and expands Billings.
  - `shows planned items as unavailable`: the `RTO` item is disabled, with title `RTO is not available yet`.
  - The phone drawer tests stay, using the new labels.
  - Replace the old labels (`Overview`, `Orders`, `Weight Discrepancy`...) in the existing assertions. That's the only change to the existing tests.
- [ ] **Step 6: Run them**
  Run: `pnpm build && pnpm exec playwright test e2e/dashboard.spec.ts`. Expected: the new sidebar tests fail.
- [ ] **Step 7: Rebuild `sidebar.tsx` to render `NAV`**
  - Single-link groups are `Link`s.
  - Groups with children are a `button` with `aria-expanded` and `aria-controls`, plus a list of child links indented with a left rule, as in the reference.
  - `planned` children are disabled buttons with the title.
  - The group for the current page starts expanded.
  - In the collapsed rail, a group icon calls `onToggle()` and expands that group.
  - Divider lines go where `dividerBefore` is set.
  - Keep `data-testid="sidebar"`, the toggle and close buttons, the user row, `transition` classes and widths exactly as they are.
- [ ] **Step 8: Run the browser tests**
  Expected: PASS.
- [ ] **Step 9: Build the shared UI components, `csv.ts`, the file moves, the e2e helpers and both scripts**
  - `scripts/dev-smoke.mjs` takes its routes from `e2e/routes.ts` (read as text, matching quoted `'/...'` routes), starts `next dev -p 3107`, signs in like `e2e/helpers.ts`, visits each route, prints `<route>: HTTP <code> | h1: <text>` and `BROWSER ERRORS: none` or the list, exits 1 on any error, and stops its server on exit.
  - `scripts/screenshots.mjs` serves the build on port 3102 and saves `test-results/screenshots/<slug>-{desktop,phone,small}.png` at 1440x900, Pixel 7 and 320x568.
- [ ] **Step 10: Verify and commit**
  Run Procedure Part D. `e2e/wallet.spec.ts`, `cod.spec.ts` and `integrations.spec.ts` must pass unchanged, which proves the moved files still work. Commit `feat(nav): new menu with sub-menus, nav config and shared screen building blocks`.

---

## Phase 1: Home

### Task 3: Home (`/home`)

**Files:**
- Create: `src/app/(app)/home/page.tsx`, `loading.tsx`, `onboarding-checklist.tsx`, `quick-actions.tsx`, `recent-shipments.tsx`
- Create: `src/lib/data/onboarding/` (types, mock, gateway, index, test)
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Produces:

```ts
export type OnboardingStep = 'kyc' | 'pickup_address' | 'recharge' | 'first_shipment';
export interface OnboardingItem { id: OnboardingStep; label: string; href: string; done: boolean }
export interface OnboardingService { getChecklist(): Promise<DataResult<OnboardingItem[]>> }
export function onboardingService(): OnboardingService;
```

- Consumes: `walletService().getBalance()`, `shipmentService().getSummary()`, `ordersService().listOrders({ page: 1, limit: 5 })`, `ndrService().getNdrDashboard()`.

**Screen:**
- Greeting `Welcome, <userLabel(email).name>`.
- Quick actions, linking to:
  - Create Shipment `/orders/create`
  - Track a Shipment `/tools/tracking`
  - Recharge Wallet `/finances/wallet?recharge=1`
  - Rate Calculator `/tools/rate-calculator`
- Four `StatTile`s:
  - Wallet Balance
  - In Transit, from the shipments summary
  - NDR Action Required, from `kpis.openNdr`
  - Delivered, from the summary
- A "Get started" checklist card.
- A "Recent shipments" card with 5 rows linking to `/orders/<awb>`, and `EmptyState` "No shipments yet." with "Create your first shipment".

On phones, the tiles sit two per row and the quick actions form a 2x2 grid.

**Mock:**
- kyc `done: false` → `/settings/company`
- pickup_address `done: true` → `/settings/pickup-addresses`
- recharge `done: true` → `/finances/wallet?recharge=1`
- first_shipment `done: false` → `/orders/create`

Labels are "Complete KYC", "Add a pickup address", "Recharge your wallet" and "Create your first shipment".

**Connection:**
- Wallet, NDR and onboarding are `notAvailable()` in gateway mode.
- Stats and recent shipments use the existing gateway routes through their services, with no new gateway code.
- Each card is its own `DataCard`, so one failure leaves the rest working.

**Named tests:**
- `onboardingService gateway mode reports unavailable` (unit)
- `greets the merchant by name`: `Welcome, ops`
- `links each quick action to its screen`: four hrefs as above
- `shows two of four setup steps done`: the text `2 of 4 done`, and the "Complete KYC" link goes to `/settings/company`
- `opens a recent shipment`: the first row link matches `/orders/DEMO`
- `shows live shipment counts from the gateway` (port 3104): In Transit shows `3`, from the stand-in stats
- `keeps Home working when the gateway is down` (port 3105): the shipments card shows the network error, and the checklist still shows

Nav: Home becomes `live`.

---

## Phase 2: Shipping Management

### Task 4: Connect All Shipments, Shipment Detail and Create Shipment

**Files:**
- Modify: `src/lib/data/orders/gateway.ts` (real create and detail timeline)
- Modify: `src/lib/data/orders/types.ts` (`CreateShipmentResult.awb: string | null`)
- Modify: `src/lib/data/tracking/` (add `getTimeline`)
- Modify: `src/lib/gateway/schemas/shipments.ts` (add `TrackingDetailSchema`, keeping `TrackingSchema` unchanged)
- Modify: `src/lib/gateway/schemas/orders.ts` (add `CreateShipmentResponseSchema`)
- Modify: `src/app/(app)/orders/[id]/page.tsx` (timeline card uses `getTimeline`)
- Modify: `src/app/(app)/orders/create/create-form.tsx` (unavailable message, null AWB)
- Test: `src/lib/data/orders/orders.test.ts`, `src/lib/data/tracking/tracking.test.ts`, `e2e/orders.spec.ts`, `e2e/gateway.spec.ts`

**Interfaces:**
- Produces:

```ts
// tracking/types.ts
export interface TrackingEvent { status: string; rawStatus: string | null; location: string | null; occurredAt: string }
export interface TrackingDetail extends TrackingSummary { timeline: TrackingEvent[] }   // newest first
// tracking service gains:
getTimeline(awb: string): Promise<DataResult<TrackingDetail>>;
// schemas/shipments.ts
export const TrackingDetailSchema  // TrackingSchema fields plus timeline[]: { status, raw_status, location, occurred_at }
// schemas/orders.ts
export const CreateShipmentResponseSchema = z.object({
  shipment_id: z.string().uuid(), carrier: z.string(), status: z.string(), duplicate: z.boolean().optional(),
});
```

- `gatewayOrdersService.createShipment(input)`:
  - posts to `/api/v1/shipments` with the input minus `merchant_id`, using `merchantCredential('shipments')`;
  - maps a 202 to `{ shipment_id, carrier, status, awb: null, reference_id: input.reference_id ?? '', created_at: new Date().toISOString() }`;
  - returns gateway errors unchanged.
- `gatewayOrdersService.getOrderDetail` keeps returning the mock detail, because there's no detail route. The page shows the timeline from `trackingService().getTimeline(awb)` in its own `DataCard`, with its own badge.

The order-engine 202 shape comes from `Evoc_ships/services/order-engine/src/shipments/shipments.controller.ts:31`, and the gateway 503 text from `services/gateway/src/shipments/shipments.controller.ts:63`.

**Features:**
- When the result is an `unavailable` error, the create form shows `Booking is not available yet: <gateway message>` and keeps every field.
- A retry reuses the same `idempotency_key`. Confirm the form keeps it in state for the life of the form, and fix it if not.
- The success dialog shows `AWB will appear once the courier confirms.` when `awb` is `null`.

**Named tests:**
- Unit:
  - `posts the shipment without merchant_id and with the bearer token`
  - `maps a 202 to a result with no AWB yet`
  - `passes the 503 message through as unavailable`
  - `getTimeline orders events newest first and maps names`
  - `getTimeline 404 says no shipment found`
- Browser, port 3104:
  - `shows the gateway timeline on a shipment`: `/orders/LIVE123` shows `Jaipur` and no sample label on the timeline card
  - `explains that booking is unavailable and keeps the form`: submit a valid form, see `Booking is not available yet: Shipment creation is disabled until merchant authentication is configured`, and the destination name is still filled
- Browser, mock:
  - `reuses the idempotency key on retry`: two submissions after a forced failure send the same key. Check this by reading the hidden `idempotency_key` input before and after.
- Port 3105:
  - `shows the timeline error but keeps shipment facts`

**Stand-in:**
- `POST /api/v1/shipments` → 503 `{ message: 'Shipment creation is disabled until merchant authentication is configured', error: 'Service Unavailable', statusCode: 503 }`
- `GET /api/v1/shipments/LIVE123/tracking` adds a second, older event: `IN_TRANSIT`, `Pune`, `2026-10-22T09:00:00.000Z`

### Task 5: B2C Shipments (`/orders/b2c`)

**Files:** `src/app/(app)/orders/b2c/page.tsx`, `loading.tsx`, `e2e/b2c.spec.ts`. Reuse `orders-table.tsx` and `orders-cards.tsx` unchanged, and `filters.tsx` through its existing props.

**Interfaces:**
- Consumes: `ordersService().listOrders(query)`.
- Produces: the B2C list, which is the order list scoped to single-parcel retail shipments. Every shipment the backend has today is single-parcel B2C (`StandardShipmentRequestSchema` has one parcel), so in gateway mode the list is the gateway list.

**Screen:**
- Title `B2C Shipments`, with a description line `Single-parcel shipments to customers.`
- The same filters, table and phone cards as All Shipments, plus a `Create B2C shipment` action going to `/orders/create`.
- Empty message: `No B2C shipments match these filters.`

**Connection:** the existing orders gateway route. No new gateway code.

**Named tests:**
- `lists B2C shipments with the shared filters`: rows from the mock, and the status tab updates `status=`
- `shows gateway shipments with no sample label` (port 3104)
- `shows the list error when the gateway is down` (port 3105)
- Plus the procedure's standard tests

Nav: B2C Shipments becomes `live`.

### Task 6: B2B Shipments (`/orders/b2b`)

**Files:**
- `src/app/(app)/orders/b2b/page.tsx`, `loading.tsx`, `b2b-table.tsx`, `b2b-cards.tsx`, `create-b2b-dialog.tsx`, `actions.ts`
- `src/lib/data/b2b/` (types, mock, gateway, index, test)
- `e2e/b2b.spec.ts`

**Interfaces:**

```ts
export interface B2bBox { lengthCm: number; widthCm: number; heightCm: number; weightKg: number; count: number }
export interface B2bShipment {
  id: string; lrNumber: string; carrier: string; status: string; consignee: string; destinationCity: string;
  boxes: number; totalWeightKg: number; invoiceValuePaise: number; createdAt: string;
}
export interface B2bShipmentInput {
  consignee: Address; pickupAddressId: string; boxes: B2bBox[]; invoiceNumber: string; invoiceValuePaise: number;
}
export interface B2bService {
  listShipments(query: { page: number; search: string }): Promise<DataResult<{ items: B2bShipment[]; page: number; pageCount: number; total: number }>>;
  createShipment(input: B2bShipmentInput): Promise<DataResult<B2bShipment>>;
}
```

**Screen:** a list with columns LR number, Consignee, Destination, Boxes, Total weight, Invoice value, Carrier, Status and Created. There is search by LR number or consignee, and pagination of 20 per page. Empty message: `No B2B shipments yet.`

**Features:** the Create B2B shipment dialog has:
- consignee address, validated with `AddressSchema` from `@logicore/contracts`;
- box rows (add and remove, 1 to 50 rows; each dimension 1 to 500 cm, weight 0.1 to 1000 kg, count 1 to 999);
- invoice number, 1 to 32 characters;
- invoice value of at least ₹1.

Total weight is shown live, summing `weightKg × count`. Invoice value above ₹50,000 shows `An e-way bill is needed for invoices over ₹50,000.`

**Connection:** no B2B route exists. The contracts support single-parcel shipments only, so the gateway service is `notAvailable()` with `DATA_SOURCE_B2B`.

**Named tests:**
- `totals box weight by count` (unit): two boxes of 2.5 kg × 4 and 10 kg × 1 give 20 kg
- `rejects an empty box list`
- `adds a created shipment to the sample list`
- `warns about e-way bills above ₹50,000`
- `shows B2B as unavailable in gateway mode` (port 3106)
- `refuses a signed-out create` (unit)

Nav: B2B Shipments becomes `live`.

### Task 7: Bulk Upload (`/orders/bulk`)

**Files:**
- `src/app/(app)/orders/bulk/page.tsx`, `upload-form.tsx`, `row-results.tsx`, `actions.ts`
- `src/lib/bulk-shipments.ts` and its test
- `public/samples/bulk-shipments-template.csv`
- `e2e/bulk.spec.ts`

**Interfaces:**

```ts
// src/lib/bulk-shipments.ts
export const BULK_COLUMNS: readonly string[]; // origin_name, origin_phone, origin_line1, origin_city, origin_state, origin_pincode, destination_name, destination_phone, destination_line1, destination_line2, destination_city, destination_state, destination_pincode, weight_kg, length_cm, width_cm, height_cm, item_name, item_quantity, item_unit_price, payment_type, cod_amount, reference_id, preferred_carrier
export const MAX_BULK_ROWS = 200;
export interface BulkRow { line: number; input: StandardShipmentRequestInput | null; errors: string[] }
export function parseBulkCsv(text: string, fileKey: string): { rows: BulkRow[]; fatal: string | null };
// idempotency_key per row = `bulk-${fileKey}-${line}`, so re-uploading the same file never double-books
```

- Server action `submitBulkAction(rows: StandardShipmentRequestInput[])` calls `ordersService().createShipment` for each row in order, and returns a per-row `{ line, ok, message, shipmentId }`.

**Screen:** a template download link, a file input (`.csv` only, up to 1 MB), a preview table of valid and invalid rows with each row's errors, and Submit valid rows. The results table shows each line's outcome.

**Features:**
- `fileKey` is the SHA-256 of the file text, computed with `crypto.subtle.digest`.
- Headers must match `BULK_COLUMNS` exactly, or the fatal message is `The file's columns don't match the template.`
- More than 200 rows gives `Upload at most 200 rows at a time.`

**Connection:** the same create path as Task 4. In gateway mode every row returns the 503 message, shown per row.

**Named tests:**
- `parses a valid template row into a shipment request` (unit)
- `reports each invalid field with its line number`: a row with pincode `012345` gives `Line 2: destination pincode is invalid`
- `rejects a file with wrong columns`
- `gives the same keys for the same file`
- `submits valid rows and shows each result` (mock)
- `shows the booking-unavailable message per row` (port 3104)
- `rejects a non-CSV file`

Nav: Bulk Upload becomes `live`.

### Task 8: Pickups & Manifests (`/orders/pickups`)

**Files:**
- `src/app/(app)/orders/pickups/page.tsx`, `schedule-dialog.tsx`, `manifest-print/[id]/page.tsx`, `actions.ts`
- `src/lib/data/pickups/`
- `e2e/pickups.spec.ts`

**Interfaces:**

```ts
export interface Pickup { id: string; pickupDate: string; window: { start: string; end: string } | null; carrier: string; addressLabel: string; awbs: string[]; status: 'scheduled' | 'picked_up' | 'cancelled' }
export interface PickupInput { pickupDate: string; window: { start: string; end: string } | null; awbs: string[]; pickupAddressId: string }
export interface PickupService {
  listPickups(query: { page: number }): Promise<DataResult<{ items: Pickup[]; page: number; pageCount: number }>>;
  readyToShip(): Promise<DataResult<OrderSummary[]>>;   // MANIFESTED shipments
  schedulePickup(input: PickupInput): Promise<DataResult<Pickup>>;
}
```

Input rules follow `PickupRequestSchema` in `@logicore/contracts`: date `YYYY-MM-DD`, window `HH:mm`.

**Screen:** a "Ready to ship" card listing manifested shipments with checkboxes, then "Scheduled pickups" with date, window, carrier, address, AWB count and status. Each pickup has `Print manifest`, which opens a print-friendly page with the AWB table and a `Sample manifest` banner in mock mode.

**Features:**
- Schedule pickup for the selected AWBs, all of which must share one carrier, or the message is `Select shipments from one courier per pickup.`
- The date must be from today to 7 days ahead, in Indian time.
- The window end must be after its start.

**Connection:**
- `readyToShip` in gateway mode uses `ordersService().listOrders({ status: 'MANIFESTED', limit: 100, page: 1 })`, which is a real route.
- Pickups have no route (`pickup.schedule.requested` has no producer in the backend), so `listPickups` and `schedulePickup` are `notAvailable()`.

**Named tests:**
- `rejects shipments from two couriers in one pickup`
- `rejects a date more than 7 days ahead`
- `schedules a pickup and lists it` (mock)
- `prints a manifest with every AWB`
- `lists manifested gateway shipments as ready to ship` (port 3104; the stand-in list filters on `status=MANIFESTED`)
- `shows pickups as unavailable in gateway mode` (port 3106)

Nav: Pickups & Manifests becomes `live`.

---

## Phase 3: Operations

### Task 9: Connect NDR

**Files:**
- Modify: `src/lib/data/ndr/index.ts` (use `resolveDataSource('ndr')`)
- Create: `src/lib/data/ndr/gateway.ts`
- Test: `src/lib/data/ndr/ndr.test.ts`, `e2e/gateway.spec.ts`

**Interfaces:**
- Produces `gatewayNdrService: NdrService`, with both methods returning `notAvailable()`. There is no NDR route, and the backend has no NDR status.
- `ndrService()` keeps its name and return type.

**Named tests:**
- `ndrService uses mock by default and gateway when set` (unit)
- `shows NDR as unavailable in gateway mode` (port 3106): the KPI tiles and list card show the unavailable message, and the action button is hidden

Check that `/ndr` still renders the action modal and that `e2e` NDR tests pass unchanged.

### Task 10: RTO (`/rto`)

**Files:**
- `src/app/(app)/rto/page.tsx`, `loading.tsx`, `rto-table.tsx`, `rto-cards.tsx`
- `src/lib/data/rto/`
- `e2e/rto.spec.ts`

**Interfaces:**

```ts
export interface RtoSummary { inProgress: number; delivered: number; rtoChargesPaise: number }
export interface RtoService {
  getSummary(): Promise<DataResult<RtoSummary>>;
  listRto(query: { stage: 'in_progress' | 'delivered'; page: number }): Promise<DataResult<OrderListResult>>;
}
```

**Screen:**
- Stat tiles: RTO in progress, RTO delivered, and RTO charges (always the sample or unavailable value).
- Stage tabs: In progress and Delivered.
- A list with AWB, Reference, Carrier, Status, raw courier status and last update, linking to `/orders/<awb>`.
- Empty message: `No shipments are returning.`

**Connection:**
- `listRto` in gateway mode calls the orders route with `status=RTO_INITIATED` or `status=RTO_DELIVERED`.
- `getSummary` uses the stats route for the two counts.
- `rtoChargesPaise` has no source in gateway mode, so that tile shows `Not available yet`.

**Named tests:**
- `maps the delivered stage to RTO_DELIVERED` (unit, on the gateway path)
- `counts RTO from stats` (unit: stand-in stats give in progress 6 and delivered 7)
- `switches stage from the tabs`
- `shows gateway RTO shipments` (port 3104)
- `shows RTO charges as not available in gateway mode`
- `shows the error when the gateway is down` (port 3105)

Nav: RTO becomes `live`. The dashboard RTO tile links to `/rto`, which is the only change to `dashboard/page.tsx`.

---

## Phase 4: Billings

### Task 11: Wallet Recharge (on `/finances/wallet`)

**Files:**
- `src/app/(app)/finances/wallet/recharge-dialog.tsx`, `actions.ts`
- Modify: `src/app/(app)/finances/wallet/page.tsx` (Recharge button; open when `?recharge=1`)
- Modify: `src/lib/data/wallet/` (add `startRecharge`)
- `e2e/wallet.spec.ts`

**Interfaces:**
- `WalletService` gains `startRecharge(amountPaise: number): Promise<DataResult<{ paymentUrl: string | null }>>`.
- The mock returns `{ paymentUrl: null }`. The gateway is `notAvailable()`, since PRD `POST /v1/wallet/recharge` has no gateway route.

**Features:**
- Preset amounts of ₹500, ₹1,000, ₹2,500 and ₹5,000, plus a custom amount from ₹100 to ₹5,00,000 in whole rupees.
- With a `paymentUrl`, the browser goes there.
- With `null`, the dialog says `Recharge isn't connected yet. No payment was taken.`, and the balance never changes.

**Named tests:**
- `opens recharge from the Home quick action link`: `/finances/wallet?recharge=1` opens the dialog
- `rejects amounts below ₹100 and above ₹5,00,000`
- `says no payment was taken in demo mode`
- `keeps the balance unchanged after a demo recharge`
- `shows recharge as unavailable in gateway mode` (port 3106)
- `refuses a signed-out recharge` (unit)

All existing `e2e/wallet.spec.ts` tests must pass unchanged.

### Task 12: Invoices (`/finances/invoices`)

**Files:**
- `src/app/(app)/finances/invoices/page.tsx`, `invoice-table.tsx`, `[id]/page.tsx` (print view)
- `src/lib/data/invoices/`
- `e2e/invoices.spec.ts`

**Interfaces:**

```ts
export interface Invoice {
  id: string; number: string; periodStart: string; periodEnd: string; shipments: number;
  freightPaise: number; codFeesPaise: number; taxablePaise: number; gstPaise: number; totalPaise: number;
  status: 'paid' | 'due'; issuedAt: string;
}
export interface InvoiceService {
  listInvoices(query: { page: number; year?: number }): Promise<DataResult<{ items: Invoice[]; page: number; pageCount: number }>>;
  getInvoice(id: string): Promise<DataResult<Invoice>>;
}
export function gstOf(taxablePaise: number): number; // 18%, rounded to the nearest paise
```

**Screen:** a list with Invoice number, Period, Shipments, Taxable, GST, Total, Status and View. There's a year filter, and the empty message `No invoices for this year.`

The print view shows the invoice laid out for A4, with a `Sample invoice. Not a tax document.` banner whenever the source is mock. It prints with `window.print()` from a Print button.

**Connection:** no invoice route, so `notAvailable()` with `DATA_SOURCE_INVOICES`.

**Named tests:**
- `calculates 18% GST` (unit: ₹1,000.00 taxable gives ₹180.00)
- `totals match taxable plus GST for every sample invoice` (unit)
- `filters by year`
- `opens the print view with the sample banner`
- `shows invoices as unavailable in gateway mode`
- `returns not found for an unknown invoice id`: the page shows `Invoice not found.`

Nav: Invoice becomes `live`.

---

## Phase 5: Reconciliation

### Task 13: Weight discrepancies (`/reconciliation/weight`)

**Files:**
- `src/app/(app)/reconciliation/weight/page.tsx`, `discrepancy-table.tsx`, `dispute-dialog.tsx`, `actions.ts`
- `src/lib/data/weight/`
- `e2e/weight.spec.ts`

**Interfaces:**

```ts
export type DiscrepancyStatus = 'open' | 'disputed' | 'accepted' | 'resolved';
export interface WeightDiscrepancy {
  id: string; awb: string; carrier: string; declaredKg: number; chargedKg: number;
  extraChargePaise: number; status: DiscrepancyStatus; raisedAt: string; respondBy: string;
}
export interface DisputeInput { id: string; note: string; evidence: { name: string; type: string; size: number }[] }
export interface WeightService {
  getSummary(): Promise<DataResult<{ open: number; disputed: number; extraChargePaise: number }>>;
  listDiscrepancies(query: { status?: DiscrepancyStatus; page: number }): Promise<DataResult<{ items: WeightDiscrepancy[]; page: number; pageCount: number }>>;
  accept(id: string): Promise<DataResult<WeightDiscrepancy>>;
  dispute(input: DisputeInput): Promise<DataResult<WeightDiscrepancy>>;
}
```

**Features:**
- Accept or dispute an open discrepancy.
- A dispute needs a note of 10 to 1,000 characters and 1 to 3 images (JPG or PNG, each up to 5 MB). Only file name, type and size are sent; the mock stores no file content.
- Rows past `respondBy` show `Response window closed` and can't be disputed.

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_WEIGHT`.

**Named tests:**
- `rejects a dispute with no images`
- `rejects a 6 MB image`
- `marks a row disputed after submitting`
- `blocks disputes after the response window`
- `filters by status`
- `shows weight as unavailable in gateway mode`

Nav: Weight becomes `live`.

### Task 14: Weight Settings (`/reconciliation/weight-settings`)

**Files:**
- `src/app/(app)/reconciliation/weight-settings/page.tsx`, `package-presets.tsx`, `actions.ts`
- `src/lib/volumetric.ts` and its test
- `src/lib/data/weight-settings/`
- `e2e/weight-settings.spec.ts`

**Interfaces:**

```ts
export const VOLUMETRIC_DIVISOR = 5000;
export function volumetricWeightKg(d: { lengthCm: number; widthCm: number; heightCm: number }): number; // L×W×H / 5000, 2 decimals
export function chargeableWeightKg(actualKg: number, d: Dimensions): number; // max(actual, volumetric)
export interface PackagePreset { id: string; name: string; lengthCm: number; widthCm: number; heightCm: number; weightKg: number; isDefault: boolean }
export interface WeightSettingsService {
  listPresets(): Promise<DataResult<PackagePreset[]>>;
  savePreset(p: Omit<PackagePreset, 'id'> & { id?: string }): Promise<DataResult<PackagePreset>>;
  deletePreset(id: string): Promise<DataResult<null>>;
}
```

**Features:**
- Add, edit and delete presets, with a name of 1 to 40 characters and at most 20 presets.
- Exactly one preset is the default.
- The chargeable weight preview updates as dimensions change.

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_WEIGHT_SETTINGS`.

**Named tests:**
- `volumetric weight of 30×20×10 cm is 1.2 kg` (unit)
- `chargeable weight is the larger of actual and volumetric`
- `keeps exactly one default preset`
- `refuses a 21st preset`
- `shows presets as unavailable in gateway mode`

Nav: Weight Settings becomes `live`.

---

## Phase 6: Tools

### Task 15: Rate Card (`/tools/rate-card`)

**Files:** `src/app/(app)/tools/rate-card/page.tsx`, `rate-table.tsx`, `src/lib/data/rates/` (shared with Task 16), `e2e/rate-card.spec.ts`

**Interfaces:**

```ts
export type Zone = 'A' | 'B' | 'C' | 'D' | 'E'; // within city, within state, metro to metro, rest of India, special
export interface RateCardRow { carrier: CarrierName; zone: Zone; baseWeightKg: number; basePaise: number; additionalPer500gPaise: number; codFeePercent: number; minCodFeePaise: number }
export interface RatesService {
  getRateCard(): Promise<DataResult<RateCardRow[]>>;
  quote(input: ServiceabilityRequest & { dimensions: Dimensions }): Promise<DataResult<RateQuote[]>>; // Task 16
}
```

`CarrierName` and `ServiceabilityRequest` come from `@logicore/contracts`. Rate card fields mirror the `RateCard` model in `Evoc_ships/services/order-engine/prisma/schema.prisma:56`.

**Screen:** a carrier filter, then a zone-by-carrier table. Phones get one card per carrier. A zone legend explains A to E.

**Connection:** the backend's rate cards are in order-engine memory and not exposed, so `notAvailable()` with `DATA_SOURCE_RATES`.

**Named tests:**
- `shows a row for every carrier and zone in the sample`
- `filters to one carrier`
- `explains each zone`
- `shows rates as unavailable in gateway mode`

Nav: Rate Card becomes `live`.

### Task 16: Rate Calculator (`/tools/rate-calculator`)

**Files:** `src/app/(app)/tools/rate-calculator/page.tsx`, `calculator-form.tsx`, `quote-list.tsx`, `actions.ts`, `e2e/rate-calculator.spec.ts`

**Interfaces:**

```ts
export interface RateQuote { carrier: CarrierName; serviceable: boolean; codAvailable: boolean; estimatedDays: number | null; chargePaise: number | null; chargeableWeightKg: number }
// server action
export async function quoteAction(input: unknown): Promise<{ ok: true; source: DataSource; quotes: RateQuote[] } | { ok: false; message: string }>;
```

Input is validated with `ServiceabilityRequestSchema` from `@logicore/contracts`, plus dimensions using `DimensionsSchema`.

**Features:**
- Pincodes must be 6 digits, not starting with 0.
- COD amount is required when the payment type is COD.
- Quotes are sorted by price, with non-serviceable carriers last as `Not serviceable`.
- Each quote shows the chargeable weight from Task 14's `chargeableWeightKg`.
- A "Ship with this" link goes to `/orders/create?carrier=<name>`.

**Connection:** there's no rates or serviceability route, so `quote` is `notAvailable()` with `DATA_SOURCE_RATES`.

**Named tests:**
- `rejects pincode 012345`
- `requires a COD amount for COD`
- `sorts quotes cheapest first and unserviceable last`
- `uses chargeable weight in the quote`
- `links a quote to Create Shipment with the carrier`
- `shows quotes as unavailable in gateway mode`
- `refuses a signed-out quote` (unit)

Nav: Rate Calculator becomes `live`.

### Task 17: Order Tracking (`/tools/tracking`)

**Files:** `src/app/(app)/tools/tracking/page.tsx`, `tracking-form.tsx`, `tracking-timeline.tsx`, `e2e/tracking.spec.ts`

**Interfaces:** consumes `trackingService().getTimeline(awb)` from Task 4, and `parseAwbQuery` from `src/lib/awb.ts`.

**Screen:**
- AWB input; the URL keeps `?awb=` so the page can be shared and reloaded.
- A result card with the status (`statusLabel`), courier, latest location, and raw courier status.
- A vertical timeline, newest first.
- A `Share tracking link` copy button for `/track/<awb>`.
- Several AWBs show a summary list, and each opens its timeline.

**Connection:** the live tracking route, through Task 4's `getTimeline`.

**Named tests:**
- `shows the sample timeline for DEMOEK001`
- `keeps the AWB in the URL`
- `says no shipment found for an unknown AWB`
- `copies the public tracking link`
- `shows the gateway timeline for LIVE123` (port 3104)
- `shows the error when the gateway is down` (port 3105)

Nav: Order Tracking becomes `live`.

### Task 18: Public tracking page (`/track/[awb]`)

**Files:**
- `src/app/(public)/layout.tsx` (uses `theme-app`, no shell)
- `src/app/(public)/track/[awb]/page.tsx`, `not-found.tsx`
- `e2e/public-tracking.spec.ts`

**Interfaces:**
- Consumes `trackingService().getTimeline(awb)`, called with no merchant token. The gateway tracking route has no auth.
- Add `fetchTimelinePublic(awb)` in `src/lib/data/tracking/gateway.ts`, which passes `token: null`.

**Screen:** brand mark, AWB, status, courier, expected stage progress (Manifested → In transit → Out for delivery → Delivered), and the timeline with locations and times. It shows no addresses, names, phone numbers or amounts. The page sets `robots: { index: false }`.

**Named tests:**
- `opens without signing in`
- `shows no personal details`: the body doesn't contain the sample recipient name, phone or address from the orders mock
- `tells robots not to index`
- `shows the not-found page for an unknown AWB`
- `shows the gateway timeline` (port 3104)
- `fits a 320px screen`

Add `/track/DEMOEK001` to `e2e/routes.ts`.

---

## Phase 7: Reports

### Task 19: Reports (`/reports`)

**Files:**
- `src/app/(app)/reports/page.tsx`, `report-form.tsx`
- `src/app/(app)/reports/export/route.ts`
- `src/lib/reports.ts` and its test
- `e2e/reports.spec.ts`

**Interfaces:**

```ts
export type ReportType = 'shipments' | 'ndr' | 'rto' | 'cod' | 'wallet';
export interface ReportRequest { type: ReportType; from: string; to: string } // YYYY-MM-DD, at most 92 days apart
export function validateReport(input: unknown): { ok: true; value: ReportRequest } | { ok: false; message: string };
export function reportColumns(type: ReportType): string[];
```

`GET /reports/export?type&from&to` checks the session, validates, and returns `text/csv` with `Content-Disposition: attachment; filename="<type>-<from>-to-<to>.csv"`, or 400 or 503 with a plain message.

**Data sources:**
- Shipments and RTO: the orders gateway route, fetching up to 10 pages of 100 when the source is gateway.
- NDR, COD and wallet: their services.

A mock-sourced CSV starts with the line `# Sample data`.

**Features:**
- The date range defaults to the last 30 days in Indian time.
- `to` can't be before `from`, or more than 92 days after it.
- There are 5 report cards, each with a short description and Download.

**Named tests:**
- `rejects a 93-day range` (unit)
- `rejects to before from` (unit)
- `downloads a shipments CSV with the right columns and filename`
- `marks sample reports with a first line`
- `returns 401 when signed out` (route)
- `returns 503 for COD in gateway mode` (port 3106)
- `downloads gateway shipments` (port 3104)

Nav: Reports becomes `live`.

---

## Phase 8: Dashboard tabs

### Task 20: Tab navigation, bar chart and Pickups tab

**Files:**
- Modify: `src/app/(app)/dashboard/sections.tsx` (`OverviewTabs` become links using `?tab=`; Overview stays the default)
- Modify: `src/app/(app)/dashboard/page.tsx` (render the selected tab)
- Create: `src/app/(app)/dashboard/tabs/pickups-tab.tsx`
- Create: `src/components/charts/bar-chart.tsx` and its test
- Test: `e2e/dashboard-tabs.spec.ts`

**Interfaces:**

```ts
export type DashboardTab = 'overview' | 'pickups' | 'ndr' | 'rto' | 'delivered' | 'revenue' | 'sms';
// bar-chart.tsx
export function BarChart(props: { label: string; data: { label: string; value: number }[]; format?: (n: number) => string }): JSX.Element;
```

The chart is an SVG with `role="img"` and an `aria-label` summary, a visually hidden data table, value labels, and axis labels in `text-on-surface/70`. Bars use `fill-primary`, and the chart scales to its container width.

Before building the chart, load the `dataviz` skill.

**Pickups tab:**
- Data from `pickupsService()` (Task 8): tiles for Scheduled today, Picked up today and Pending pickup, plus a 7-day bar chart of pickups.
- In gateway mode it shows the unavailable message.

**Named tests:**
- `opens a tab from the URL`: `/dashboard?tab=pickups` selects Pickups
- `ignores an unknown tab`: `?tab=FOO` shows Overview
- `keeps Overview unchanged`: all existing `e2e/dashboard.spec.ts` tests pass unchanged
- `draws one bar per day with an accessible summary` (unit)
- `shows pickups as unavailable in gateway mode`

Tabs not yet built stay disabled.

### Task 21: NDR and RTO tabs

**Files:** `src/app/(app)/dashboard/tabs/ndr-tab.tsx`, `rto-tab.tsx`, `e2e/dashboard-tabs.spec.ts`

**Contents:**
- **NDR tab:** reuses `ndrService().getNdrDashboard()` for the 4 KPIs, a bar chart of NDR reasons, and a `View all NDR` link to `/ndr`.
- **RTO tab:** reuses `rtoService()` (Task 10) for in progress and delivered counts, a bar chart of RTO by courier, and a link to `/rto`.

**Named tests:**
- `NDR tab shows reasons and links to NDR`
- `RTO tab shows counts from gateway stats` (port 3104: 6 and 7)
- Each tab's gateway-down or unavailable state

### Task 22: Delivered and Revenue tabs

**Files:** `src/app/(app)/dashboard/tabs/delivered-tab.tsx`, `revenue-tab.tsx`, and `src/lib/data/analytics/` (types, mock, gateway, index, test)

**Interfaces:**

```ts
export interface DailyPoint { day: string; value: number } // day = YYYY-MM-DD in Indian time
export interface AnalyticsService {
  deliveredByDay(days: 7 | 30): Promise<DataResult<DailyPoint[]>>;
  revenueByDay(days: 7 | 30): Promise<DataResult<{ freightPaise: DailyPoint[]; codPaise: DailyPoint[] }>>;
}
```

**Contents:**
- **Delivered tab:** the delivered total from stats (a real route) and a delivered-per-day chart from analytics, which has no route and so is `notAvailable()` in gateway mode. There's a 7 or 30 day toggle in the URL as `range=`.
- **Revenue tab:** freight spend and COD collected per day, with totals formatted by `formatPaise`.

**Named tests:**
- `switches between 7 and 30 days`
- `totals revenue from daily points` (unit)
- `shows the live delivered total but unavailable trend in gateway mode` (port 3104)

### Task 23: SMS tab

**Files:** `src/app/(app)/dashboard/tabs/sms-tab.tsx`, `src/lib/data/messages/`

**Interfaces:**

```ts
export interface MessageStats { sent: number; delivered: number; failed: number; byStatus: { status: string; count: number }[] }
export interface MessagesService { getStats(days: 7 | 30): Promise<DataResult<MessageStats>> }
```

**Contents:** tiles for Sent, Delivered and Failed, plus a delivery rate as a percentage with one decimal, and a chart of messages by shipment status. A `Manage buyer notifications` link goes to `/settings/notifications`. There's no route, so `notAvailable()`.

**Named tests:**
- `calculates delivery rate to one decimal` (unit: 980 of 1,000 is 98.0%)
- `links to buyer notification settings`
- `shows SMS as unavailable in gateway mode`

After this task, every dashboard tab is enabled.

---

## Phase 9: Settings

### Task 24: Settings hub and Profile

**Files:**
- `src/app/(app)/settings/page.tsx`, `settings-nav.tsx`
- `src/app/(app)/settings/profile/page.tsx`, `profile-form.tsx`, `actions.ts`
- `src/lib/data/profile/`
- `e2e/settings.spec.ts`

**Interfaces:**

```ts
export interface SettingsSection { label: string; description: string; href: string; status: NavStatus }
export const SETTINGS_SECTIONS: SettingsSection[]; // in settings-nav.tsx, in the order of the Decisions table
export interface Profile { name: string; email: string; phone: string }
export interface ProfileService {
  getProfile(): Promise<DataResult<Profile>>;
  updateProfile(p: Pick<Profile, 'name' | 'phone'>): Promise<DataResult<Profile>>;
  changePassword(current: string, next: string): Promise<DataResult<null>>;
}
```

**Screen:**
- `/settings` lists every section as a card with a description. `planned` sections are disabled until their task flips them.
- Settings pages share a left section list on desktop. On phones that becomes a `Back to Settings` link.
- API Keys & Channel Integrations links to `/channel-integrations`.

**Profile features:**
- Name 1 to 80 characters, phone `^\+?[0-9]{10,15}$`, and email read-only from the session.
- Change password: the new password needs 8 or more characters, must match its confirmation, and must differ from the current one.

**Connection:** no profile route, so `notAvailable()` with `DATA_SOURCE_PROFILE`.

**Named tests:**
- `lists every settings section`
- `opens Channel Integrations from Settings`
- `marks Settings active in the sidebar on Channel Integrations`
- `shows the session email read-only`
- `rejects a mismatched password confirmation`
- `saves the profile` (mock)
- `shows the profile as unavailable in gateway mode`

Nav: Settings becomes `live`, and Profile and the Channel Integrations link go live in `SETTINGS_SECTIONS`.

### Task 25: Company & KYC (`/settings/company`)

**Files:** `src/app/(app)/settings/company/page.tsx`, `company-form.tsx`, `kyc-documents.tsx`, `actions.ts`, `src/lib/kyc.ts` and its test, `src/lib/data/company/`

**Interfaces:**

```ts
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_PATTERN = /^[0-9]{9,18}$/;
export type KycStatus = 'not_started' | 'submitted' | 'verified' | 'rejected';
export interface CompanyDetails { legalName: string; brandName: string; gstin: string; pan: string; address: Address; bank: { holder: string; account: string; ifsc: string } }
export interface CompanyService {
  getCompany(): Promise<DataResult<{ details: CompanyDetails | null; kycStatus: KycStatus; documents: { kind: 'gst' | 'pan' | 'cheque'; name: string }[] }>>;
  saveCompany(d: CompanyDetails, documents: { kind: 'gst' | 'pan' | 'cheque'; name: string; type: string; size: number }[]): Promise<DataResult<{ kycStatus: KycStatus }>>;
}
```

**Features:**
- Field validation uses the patterns above, uppercasing GSTIN, PAN and IFSC as typed.
- The address uses `AddressSchema`.
- Documents are PDF, JPG or PNG, each up to 5 MB, with one per kind required.
- The status badge shows KYC status, and the account number shows only its last 4 digits after saving.
- Saving in mock mode sets the status to `submitted`, and the Home checklist's KYC step then shows done, since it uses the same mock store.

**Connection:** the PRD's `/v1/merchants/onboard` is not in the gateway, so `notAvailable()` with `DATA_SOURCE_COMPANY`.

**Named tests:**
- `accepts a valid GSTIN and rejects one with a bad checksum position` (unit: `27AAPFU0939F1ZV` valid, `27AAPFU0939F1AV` invalid)
- `rejects IFSC without a 0 in the fifth place`
- `requires all three documents`
- `masks the saved account number`
- `marks the Home KYC step done after submitting`
- `shows company details as unavailable in gateway mode`

### Task 26: Users & Roles (`/settings/users`)

**Files:** `src/app/(app)/settings/users/page.tsx`, `invite-dialog.tsx`, `actions.ts`, `src/lib/data/team/`

**Interfaces:**

```ts
export type Role = 'admin' | 'operations' | 'finance' | 'viewer';
export const ROLE_DESCRIPTIONS: Record<Role, string>; // what each role can see and do
export interface TeamMember { id: string; email: string; name: string | null; role: Role; status: 'active' | 'invited' }
export interface TeamService {
  listMembers(): Promise<DataResult<TeamMember[]>>;
  invite(email: string, role: Role): Promise<DataResult<TeamMember>>;
  changeRole(id: string, role: Role): Promise<DataResult<TeamMember>>;
  remove(id: string): Promise<DataResult<null>>;
}
```

**Features:**
- Inviting validates the email and rejects duplicates.
- The signed-in user can't change their own role or remove themselves.
- At least one admin must remain.
- Removing someone asks for confirmation in a `Dialog`.

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_TEAM`.

**Named tests:**
- `rejects a duplicate invite`
- `blocks removing the last admin`
- `hides role and remove controls on your own row`
- `shows each role's description`
- `shows the team as unavailable in gateway mode`

### Task 27: Pickup Addresses (`/settings/pickup-addresses`)

**Files:** `src/app/(app)/settings/pickup-addresses/page.tsx`, `address-form.tsx`, `actions.ts`, `src/lib/data/pickup-addresses/`

**Interfaces:**

```ts
export interface PickupAddress { id: string; label: string; address: Address; isDefault: boolean }
export interface PickupAddressService {
  list(): Promise<DataResult<PickupAddress[]>>;
  save(a: Omit<PickupAddress, 'id'> & { id?: string }): Promise<DataResult<PickupAddress>>;
  remove(id: string): Promise<DataResult<null>>;
}
```

**Features:**
- Add, edit and delete addresses, with a label of 1 to 40 characters, the address checked with `AddressSchema`, and at most 25 addresses.
- Exactly one default, and the default can't be deleted while others exist.
- The Create Shipment and B2B forms and Pickups (Tasks 6 and 8) offer these addresses through a select. Wire it in this task and note it as a change to `orders/create/create-form.tsx`: an optional "Use saved address" select that fills the origin fields.

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_PICKUP_ADDRESSES`.

**Named tests:**
- `refuses to delete the only default`
- `fills origin from a saved address on Create Shipment`
- `refuses a 26th address`
- `shows addresses as unavailable in gateway mode`

### Task 28: Buyer Notifications (`/settings/notifications`)

**Files:** `src/app/(app)/settings/notifications/page.tsx`, `channel-matrix.tsx`, `template-editor.tsx`, `src/lib/templates.ts` and its test, `src/lib/data/notifications/`

**Interfaces:**

```ts
export type NotifyChannel = 'sms' | 'email' | 'whatsapp';
export type NotifyEvent = 'MANIFESTED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RTO_INITIATED';
export const TEMPLATE_VARIABLES = ['{{buyer_name}}', '{{awb}}', '{{courier}}', '{{tracking_link}}', '{{store_name}}'] as const;
export function renderTemplate(text: string, values: Record<string, string>): string;
export function unknownVariables(text: string): string[];
export interface NotificationSettings { matrix: Record<NotifyEvent, Record<NotifyChannel, boolean>>; templates: Record<NotifyEvent, string> }
export interface NotificationService { get(): Promise<DataResult<NotificationSettings>>; save(s: NotificationSettings): Promise<DataResult<NotificationSettings>> }
```

The events are the PRD webhook states that trigger buyer messages.

**Features:**
- An on/off matrix of event by channel, using switches with `role="switch"`.
- A template editor per event with a live preview using sample values.
- Unknown variables block saving, with the message `Unknown variable: {{x}}`.
- An SMS template over 160 characters shows `Sends as 2 messages`, with the count from its length.

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_NOTIFICATIONS`.

**Named tests:**
- `renders every known variable` (unit)
- `lists unknown variables` (unit)
- `counts SMS parts at 160 characters`
- `toggles a channel for an event and saves`
- `shows notifications as unavailable in gateway mode`

### Task 29: Tracking Page (`/settings/tracking-page`)

**Files:** `src/app/(app)/settings/tracking-page/page.tsx`, `branding-form.tsx`, `preview.tsx`, `src/lib/data/tracking-page/`

**Interfaces:**

```ts
export interface TrackingPageBranding { displayName: string; supportEmail: string; supportPhone: string; accent: 'primary' | 'accent' | 'success'; showCourier: boolean; logoName: string | null }
export interface TrackingPageService { get(): Promise<DataResult<TrackingPageBranding>>; save(b: TrackingPageBranding): Promise<DataResult<TrackingPageBranding>> }
```

The accent choice is limited to palette tokens, to keep the colour rule.

**Features:**
- A form with a live preview of the Task 18 page layout, using the sample AWB.
- The logo is PNG or SVG, up to 1 MB; only its name is kept.
- The display name is 1 to 40 characters.
- The support email and phone are validated.
- Saving doesn't change the public page until a backend route exists. The page says this: `Changes apply to the public page once tracking-page settings are connected.`

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_TRACKING_PAGE`.

**Named tests:**
- `previews the display name live`
- `offers only palette accents`
- `rejects a 2 MB logo`
- `shows tracking-page settings as unavailable in gateway mode`

### Task 30: Courier Rules (`/settings/courier-rules`)

**Files:** `src/app/(app)/settings/courier-rules/page.tsx`, `priority-list.tsx`, `src/lib/data/courier-rules/`

**Interfaces:**

```ts
export type AllocationPreference = 'lowest_cost' | 'fastest' | 'custom';
export interface CourierRules { preference: AllocationPreference; priority: CarrierName[]; disabled: CarrierName[] }
export interface CourierRulesService { get(): Promise<DataResult<CourierRules>>; save(r: CourierRules): Promise<DataResult<CourierRules>> }
```

`priority` always contains every `CARRIERS` entry once.

**Features:**
- Choose a preference, matching the PRD's allocation engine preference of lowest cost or fastest SLA.
- With `custom`, reorder couriers with Move up and Move down buttons, which work on phones and keyboards. There's no drag.
- Couriers can be switched off, but at least one must stay on.

**Connection:** order-engine reads `request.preference`, but the contract strips it and there's no settings route, so `notAvailable()` with `DATA_SOURCE_COURIER_RULES`.

**Named tests:**
- `keeps every courier exactly once after reordering` (unit)
- `refuses to switch off the last courier`
- `moves a courier up with the keyboard`
- `shows courier rules as unavailable in gateway mode`

### Task 31: Sub-merchants (`/settings/sub-merchants`)

**Files:** `src/app/(app)/settings/sub-merchants/page.tsx`, `onboard-dialog.tsx`, `actions.ts`, `src/lib/data/sub-merchants/`

**Interfaces:**

```ts
export interface SubMerchant { id: string; name: string; email: string; gstin: string | null; kycStatus: KycStatus; bankLast4: string; createdAt: string }
export interface SubMerchantInput { name: string; email: string; gstin: string | null; bank: { holder: string; account: string; ifsc: string } }
export interface SubMerchantService {
  list(query: { page: number; search: string }): Promise<DataResult<{ items: SubMerchant[]; page: number; pageCount: number; total: number }>>;
  onboard(input: SubMerchantInput): Promise<DataResult<SubMerchant>>;
}
```

The patterns come from Task 25's `src/lib/kyc.ts`, matching the PRD's `/v1/merchants/onboard` body of KYC details and bank account.

**Features:**
- A list with search and pagination.
- The onboard dialog validates the GSTIN as optional, plus the bank details.
- Only the last 4 digits of an account are shown.
- Empty message: `No sub-merchants yet. Onboard your first seller.`

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_SUB_MERCHANTS`.

**Named tests:**
- `onboards a seller and lists them`
- `shows only the last 4 account digits`
- `searches by name`
- `shows sub-merchants as unavailable in gateway mode`
- `refuses a signed-out onboard` (unit)

---

## Phase 10: Help & Support

### Task 32: Support Tickets (`/support/tickets`)

**Files:** `src/app/(app)/support/tickets/page.tsx`, `new-ticket-dialog.tsx`, `[id]/page.tsx`, `reply-form.tsx`, `actions.ts`, `src/lib/data/support/`

**Interfaces:**

```ts
export type TicketCategory = 'shipment' | 'pickup' | 'billing' | 'cod' | 'weight' | 'technical' | 'other';
export type TicketStatus = 'open' | 'awaiting_you' | 'resolved';
export interface TicketMessage { from: 'you' | 'support'; body: string; at: string }
export interface Ticket { id: string; subject: string; category: TicketCategory; awb: string | null; status: TicketStatus; updatedAt: string; messages: TicketMessage[] }
export interface SupportService {
  listTickets(query: { status?: TicketStatus; page: number }): Promise<DataResult<{ items: Ticket[]; page: number; pageCount: number }>>;
  getTicket(id: string): Promise<DataResult<Ticket>>;
  createTicket(input: { subject: string; category: TicketCategory; awb: string | null; body: string }): Promise<DataResult<Ticket>>;
  reply(id: string, body: string): Promise<DataResult<Ticket>>;
}
```

**Features:**
- Subject 5 to 120 characters, body 20 to 5,000 characters.
- An optional AWB, checked against `parseAwbQuery` (one AWB only).
- A status filter.
- Replies append to the thread.
- Resolved tickets show `This ticket is resolved. Reply to reopen it.`, and replying sets it back to `open`.

**Connection:** no route, so `notAvailable()` with `DATA_SOURCE_SUPPORT`.

**Named tests:**
- `creates a ticket and opens it`
- `rejects a body under 20 characters`
- `reopens a resolved ticket on reply`
- `filters by status`
- `shows tickets as unavailable in gateway mode`
- `returns not found for an unknown ticket id`

Nav: Support Tickets becomes `live`.

### Task 33: Help Centre (`/support/help`)

**Files:** `src/app/(app)/support/help/page.tsx`, `[slug]/page.tsx`, `src/content/help/articles.ts`, `src/lib/help-search.ts` and its test

**Interfaces:**

```ts
export interface HelpArticle { slug: string; title: string; category: 'getting_started' | 'shipping' | 'billing' | 'integrations' | 'account'; summary: string; body: { heading: string; paragraphs: string[] }[] }
export const ARTICLES: HelpArticle[];
export function searchArticles(query: string, articles: HelpArticle[]): HelpArticle[]; // title, summary and body, case-insensitive, title matches first
```

**Content:** at least 10 articles, written for merchants. Facts come only from what the app and backend do. The webhook signature article is adapted from `Evoc_ships/docs/guides/verify-webhook-signature.md`, using its header names `X-LogiCore-Event-Id`, `X-LogiCore-Timestamp` and `X-LogiCore-Signature`. No article promises a feature that isn't built.

**Features:**
- Search with results that update as you type.
- Category filter.
- Article page with a `Still need help? Raise a ticket` link to `/support/tickets?new=1`.

**Connection:** static content in the repo, so there's no data source to switch.

**Named tests:**
- `ranks title matches before body matches` (unit)
- `finds the webhook signature article`
- `opens a ticket from an article`
- `returns not found for an unknown article`

Nav: Help Centre becomes `live`.

---

## Phase 11: Sign-in and system pages

### Task 34: Forgot password (`/forgot-password`)

**Files:**
- `src/app/(auth)/forgot-password/page.tsx`, `forgot-form.tsx`, `actions.ts`
- Modify: `src/lib/data/session/` (add `requestPasswordReset`)
- Modify: `src/app/(auth)/login/fields.tsx` (add a `Forgot password?` link under the password field)

**Interfaces:**
- `SessionService` gains `requestPasswordReset(email: string): Promise<DataResult<{ demo: boolean }>>`.
- The mock returns `{ demo: true }`. The gateway uses the existing `notAvailable` pattern in `session/gateway.ts`.

**Screen:** uses `theme-auth` and the login page's split layout, reusing `BrandPanel`.

**Features:**
- Email validated with `emailSchema`.
- The same response whether or not the account exists: `If an account exists for this email, a reset link is on its way.` In mock mode it adds `Demo mode: no email is sent.`
- Back to sign in.

**Named tests:**
- `links from the password field`
- `gives the same message for any valid email`
- `says no email is sent in demo mode`
- `fits and centres on phones`, which reuses the login phone balance check from `e2e/login.spec.ts`

All existing login tests must pass.

### Task 35: Sign up and onboarding (`/signup`)

**Files:**
- `src/app/(auth)/signup/page.tsx`, `signup-form.tsx`, `actions.ts`
- Modify: `src/lib/data/session/` (add `signUp`)
- Modify: `src/app/(auth)/login/page.tsx` (add a `New here? Create an account` link)

**Interfaces:**
- `SessionService` gains `signUp(input: { company: string; name: string; email: string; phone: string; password: string }): Promise<DataResult<{ email: string }>>`.

**Features:**
- Company 2 to 80 characters, name 1 to 80, email, phone `^\+?[0-9]{10,15}$`, password of 8 or more characters, and terms required.
- On success it creates the demo session with `createDemoSession` and redirects to `/home`, where the checklist guides setup.

**Named tests:**
- `creates an account and lands on Home`
- `rejects a short password`
- `requires the terms`
- `links between sign-in and sign-up`
- `refuses signup when the session service is set to gateway` (unit test on `signUpAction`, with `process.env.DATA_SOURCE_SESSION = 'gateway'` set in the test and removed after it): returns the message `Sign-in is not available yet.` This isn't a browser test, because setting gateway sign-in on a shared test server would stop every other test on it from signing in.

### Task 36: Not-found and error pages

**Files:** `src/app/not-found.tsx`, `src/app/(app)/error.tsx` (client), `src/app/global-error.tsx`

**Screen:**
- **Not found:** a heading `Page not found`, plus links to `/home` and `/dashboard`.
- **App error:** `Something went wrong on this page.`, with `Try again` (calling `reset()`) and `Go to Home`. It shows no technical detail.
- **Global error:** the same message with its own minimal `<html>`.

**Named tests:**
- `shows the not-found page for an unknown route`: `/no-such-page` gives a 404 and the heading
- `recovers from a page error`: a test-only route `src/app/(app)/__error-test/page.tsx` throws only when `process.env.E2E_ERROR_ROUTE === 'on'`, which is set on the port 3101 server and is otherwise `notFound()`. Expect the error page, then Try again.
- `keeps the shell on app errors`: the sidebar is still visible

---

## Phase 12: Final integration

### Task 37: Full regression, real-gateway check and handover

**Files:** `Readme.md`, `updatesDoc.md`, `docs/superpowers/specs/2026-11-04-frontend-design.md` (status table), `e2e/routes.ts`

- [ ] **Step 1: Check the route list**
  Confirm `e2e/routes.ts` lists every route in the navigation map, the settings sections, `/track/DEMOEK001`, `/forgot-password` and `/signup`.
- [ ] **Step 2: Run the complete verification from a clean install**
  ```bash
  rm -rf node_modules .next && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e && node scripts/dev-smoke.mjs
  ```
  Expected: every command exits 0, with `0 failed` and `BROWSER ERRORS: none`.
- [ ] **Step 3: Take screenshots of every route**
  Run `node scripts/screenshots.mjs` for all routes and review each at desktop, phone and 320px. Fix and re-test anything found.
- [ ] **Step 4: Check against the real gateway, only if Docker is installed**
  1. Start Redpanda only, from `Evoc_ships`: `docker compose -f infra/docker-compose.yml up -d --wait redpanda`.
  2. Start the gateway with env vars only, so no file is added: `DASHBOARD_MOCK_MODE=true node services/gateway/dist/main.js`.
  3. Run the frontend with `DATA_SOURCE_SHIPMENTS=gateway DATA_SOURCE_ORDERS=gateway DATA_SOURCE_TRACKING=gateway DEV_SHIPMENTS_TOKEN=demo-merchant-001 pnpm dev`.
  4. Confirm the dashboard counts and All Shipments come from the gateway's demo data (8 shipments for `demo-merchant-001`), and that Create Shipment shows the 503 message.
  5. Record the results in `updatesDoc.md`.

  If Docker isn't installed, record "not run: Docker not installed".
- [ ] **Step 5: Final backend check**
  `git -C ../Evoc_ships status --porcelain` prints nothing, and HEAD is `aace603`.
- [ ] **Step 6: Final docs**
  Update `Readme.md` (full screen table, data-source table and "Adding a screen" section) and `updatesDoc.md` (a final summary with counts of screens, tests and every not-verified item).
- [ ] **Step 7: Commit**
  Commit `chore: full regression and handover for the complete frontend`. Tell the team the branch is ready to merge.

---

## Adding a screen in future

New screens must fit without restructuring. Task 37 copies this checklist into `Readme.md`.

1. **Navigation:** add an entry to `NAV` in `src/components/shell/nav-config.ts`, as a new group or a child of one, with `status: 'planned'`. For a settings page, add it to `SETTINGS_SECTIONS` instead.
2. **Data:** create `src/lib/data/<feature>/` with the four standard files. The gateway service uses `gatewayFetch` if the backend has a route, or `notAvailable()` until it does.
3. **Page:** create the route folder under `src/app/(app)/`, following the page pattern in **Files**.
4. **Delivery:** follow the Screen Delivery Procedure, Parts A to E, which flips the entry to `live` in step A6.
5. **Tests:** add the route to `e2e/routes.ts`, so the dev-mode check and screenshots include it.
6. **Environment:** add the `DATA_SOURCE_<FEATURE>` line to `.env.example`, and the env entry to the right test server in `playwright.config.ts`.

Known future work: API key management and the developer sandbox, cancel shipment, label download, real-time updates, real sign-in, and live data for every `notAvailable()` feature. All of these wait on backend routes, and each replaces one gateway file when its route lands.
