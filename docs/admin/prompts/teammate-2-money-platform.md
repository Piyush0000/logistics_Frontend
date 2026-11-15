# Teammate 2: Money and platform sections of the Evoc Ships admin panel

You can follow this brief yourself, or paste all of it into your AI coding assistant as its task.

---

## Your role

You build the **Money and platform** half of the Evoc Ships admin panel: Money, Pricing & couriers and System, including the **audit log** that both teammates use. Teammate 1 builds Overview, Merchants, Onboarding & KYC, Shipments and Support at the same time. The project moderator reviews, tests and merges every pull request.

## What already exists

The admin panel is at `/admin`, inside the merchant frontend repo (`logistics_Frontend`): Next.js 16 App Router, React 19, Tailwind 4, TypeScript and pnpm.

The foundation is on `main`:
- **Sign-in:** founder-only, at `/admin/login`.
- **Shell:** menu, phone menu, theme switch and sign out.
- **Data:** a typed data service per section, with shared sample data.
- **Pages:** every section page already shows its main data. A **"Still to build here"** card at the bottom lists exactly what is left.

**Overview (`src/app/admin/page.tsx`) is the reference page.** Copy its shape.

Read these before writing any code:
1. `docs/admin/README.md`: setup, security, code layout, how a section is built
2. `docs/admin/team-split.md`: ownership, shared files, contracts, working agreement
3. `docs/admin/backend-needs.md`: the backend routes that exist (ledger, reconciliation, webhooks) but are not exposed yet
4. `src/app/admin/page.tsx`, `src/app/admin/money/page.tsx`, `src/app/admin/system/page.tsx`
5. `src/lib/admin/data/money/` (`types.ts`, `mock.ts`, `gateway.ts`, `index.ts`), the data pattern you will repeat
6. `e2e/admin.spec.ts` and `e2e/admin-helpers.ts`, the browser-test pattern

## Setup

```bash
git checkout main
git pull
pnpm install
pnpm dev                     # http://localhost:3100/admin
```

Sign in with the demo account shown on the sign-in page: `admin@evocships.test` / `evoc-admin-demo`.

For each piece of work:

```bash
git checkout main
git pull
git checkout -b admin/<section>-<feature>    # e.g. admin/system-audit
```

## Rules (a PR that breaks one is sent back)

1. **Files you may edit:**
   - your own folders: `src/app/admin/{money,pricing,system}/**` and `src/lib/admin/data/{money,pricing,system}/**`;
   - new `e2e/admin-<section>.spec.ts` files;
   - your section's `updatesDoc.md` entry.

   Shared files (`admin-nav.ts`, `admin-shell.tsx`, `status-chip.tsx`, `planned-work.tsx`, `seed.ts`, `common.ts`, `src/lib/admin/session.ts`, `credentials.ts`, `token.ts`) change only with the moderator's agreement. Say so in the PR description. **Never touch** the merchant app (`src/app/(app)`, `(auth)`, `(public)`) or the backend repo (`Evoc_ships`).
2. **Every admin page and server action** starts with `await requireAdminSession()`.
3. **Data:** load it only through the section's service (`adminMoneyService()` and so on), never by importing `mock.ts` directly. New methods go in the service's `types.ts`, its `mock.ts`, and `gateway.ts` (`notAvailable` until the backend has a route).
4. **Server actions** validate every input on the server, return a plain state object for `useActionState`, and never trust the browser.
5. **Money** is always integer paise, never floats or rupee strings. Parse rupee input to paise on the server: at most 2 decimals, no negatives (use a direction field instead), and an upper limit. Show amounts with `formatPaise`.
6. **No `loading.tsx`** on routes that can answer 404 (detail pages) or their parent folders: a loading screen forces status 200. Use `<Suspense>` inside the page after the `notFound()` check instead.
7. **Design:**
   - use the existing building blocks: `PageHeader`, `DataCard`, `StatTile`, `tableStyles`, `EmptyState`, `Dialog` with `PRIMARY_BUTTON`/`SECONDARY_BUTTON`, `StatusChip`, the charts in `src/components/charts`, `CarrierBadge`;
   - colour tokens only, never raw hex, `bg-white` or `gray-*`;
   - motion by opacity only (`motion-rise`, `motion-stagger`).
8. **Phones and themes:**
   - every page works at 320px, 768px and 1440px, in light and dark, with no sideways scroll;
   - below 1024px, replace wide tables with one card per row;
   - tap targets are at least 44px (`h-11 lg:h-control`).
9. **Accessibility:** one `h1` per page (via `PageHeader`); labels on every field; colour is never the only signal; dialogs use the shared `Dialog`; switches keep a real `<input type="checkbox" role="switch">`.
10. **No secrets, no real merchant data,** and never commit `.env.local`.
11. **Docs:**
    - delete each item from the section's `PlannedWork` card as you ship it, and remove the card when the section is complete;
    - add an entry to `updatesDoc.md` for each merged piece.

## Contracts Teammate 1 depends on (keep these stable)

| Contract | Rule |
|---|---|
| `adminMoneyService().getMerchantWallet(merchantId): Promise<DataResult<MerchantWallet>>` | Already exists, and Teammate 1's merchant page calls it. Don't rename it or change its shape. Adding optional fields is fine. |
| `recordAudit({ action, target, detail })` | **Your first PR.** Publish the exact signature in its description so Teammate 1 can call it from merchant suspend, KYC decisions and ticket changes. |

## Your sections and what "done" means

### 1. System: the audit log (start here, it unblocks Teammate 1)

- **`recordAudit` helper:** add `recordAudit(entry: { action: string; target: string; detail: string }): Promise<void>` in `src/lib/admin/data/system/`. Export it from `index.ts`, add it to the service's types, mock and gateway, and make it server-only.
  - **Mock:** add to a module-level list, newest first, with `id` and `at` set by the helper, kept until the server restarts.
  - **Gateway:** `notAvailable`; the backend has no audit store yet.
- **Audit log page:** shows the recorded entries. Filter by action (`?action=`) and date range (`?from=&to=`, YYYY-MM-DD, `to` not before `from`). Add pagination.
- **Done when:** an action recorded on one page appears in the log after navigating there, and invalid filters are ignored rather than crashing.

### 2. Money

- **Summary figures** at the top: total wallet float, number of negative wallets, COD outstanding, short payments. Use `StatTile` cards like Overview.
- **Wallet adjustment:**
  - **Service:** add `adjustWallet({ merchantId, amountPaise, direction: 'credit' | 'debit', reason })`.
  - **UI:** a `Dialog` per wallet row: amount in rupees (converted to paise on the server), direction, and a required reason of 5 to 300 characters. The confirm step shows the new balance before saving.
  - **After saving:** the mock updates the balance, the merchant page (Teammate 1) shows the same balance, and `recordAudit` is called.
  - **Done when:** zero, negative, over-limit or 3-decimal amounts are rejected on the server, and an unknown merchant is rejected.
- **Per-merchant ledger:** `/admin/money/wallets/[merchantId]` lists the transactions (add a mock list), including your adjustments. An unknown merchant answers 404.
- **COD remittances:**
  - **Detail page:** `/admin/money/cod/[id]`, showing the lines (AWB, merchant, expected, received).
  - **Actions:** Reconcile and Verify bank, mirroring the reconciliation service's `reconcile` and `verify-bank` routes.
  - **Exceptions:** a list with Resolve (a reason is required).
  - **Overdue view:** couriers past their payout date.
  - **Mock everything; audit every action.**
  - **Done when:** a reconciled batch cannot be reconciled again, and short batches show the difference in red.
- **Phone cards** for every table.

### 3. Pricing & couriers

- **Courier on/off:**
  - **Service:** add `setCourierEnabled(carrier, enabled)`, using a switch with a visible off state. The `SwitchTrack` in `src/app/(app)/settings/switch.tsx` is the merchant app's pattern; copy it into your folder rather than importing across apps.
  - **Behaviour:** confirm before turning a courier off. At least one courier must stay on, enforced on the server too. Audit the change.
- **Edit a rate card row:**
  - **UI:** a `Dialog`. Base price and each extra 500 g in rupees (converted to paise on the server, greater than 0, at most ₹10,000), COD percent from 0 to 10 with up to 2 decimals, and a COD minimum.
  - **Behaviour:** audit the change. Show the old and new values in the confirm step.
- **Filters and layout:** filter by courier and zone (`?carrier=&zone=`). On phones, group the rows by courier.
- **Zone reference card:** what zones A to E mean, matching the backend's `resolveZone` (A same city prefix, B same state, C metro to metro, D rest of India, E special or remote).
- **Per-merchant overrides:** a merchant on a custom price. Add a service method and a small table of overrides with add and remove.
- **Done when:** invalid prices are rejected on the server, and turning off the last courier is refused with a clear message.

### 4. System: health and webhooks

- **Live health:**
  - **Service:** `getHealth()` keeps returning mock data in mock mode. Write the gateway version to call one future `GET /api/v1/admin/health` route (see `backend-needs.md`) with a short timeout.
  - **UI:** show "No answer" for a service that times out, and add a Refresh button.
- **Webhook delivery failures across merchants:**
  - **Data:** add `listWebhookFailures()` and `retryWebhookDelivery(id)` with mock data.
  - **UI:** a table with merchant, event, attempts, last error and Retry. Audit retries.
- **Done when:** a retry updates the row's state, and the page works when health data fails (each card shows its own error).

## Tests (part of "done")

- **Unit tests** (Vitest, `*.test.ts` next to the code) for rupee-to-paise parsing, input checks, mock state changes (adjustments, courier rules, audit ordering) and filters. Run `pnpm test`.
- **Browser tests:** one spec per section, `e2e/admin-<section>.spec.ts`, starting with `await signInAdmin(page)` from `e2e/admin-helpers.ts`. Cover the main flow, a rejected input, a 404, and phone width. Run with:
  ```bash
  pnpm build
  pnpm exec playwright test e2e/admin-<section>.spec.ts
  ```
  Mock state lasts until the server restarts, so tests that change data must not depend on running order. Make them read the value before changing it, or use their own sample row. Do **not** add admin routes to `e2e/routes.ts`.

## Before every PR

```bash
git pull origin main
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test e2e/admin.spec.ts e2e/admin-<section>.spec.ts
```

Every command must pass.

**PR into `main`:**
- **Title:** `admin(<section>): <what>`
- **Description:**
  - what changed;
  - screenshots at phone and desktop, light and dark;
  - any shared file you touched, and why;
  - the commands above and their results.

One section, or one feature of a section, per PR. Your first PR is the audit helper.

## Ask the moderator when

- you need a shared file changed;
- a contract with Teammate 1 needs to change;
- a backend route would unblock you (add it to `docs/admin/backend-needs.md` in your PR).
