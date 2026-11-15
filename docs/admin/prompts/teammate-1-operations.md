# Teammate 1: Operations sections of the Evoc Ships admin panel

You can follow this brief yourself, or paste all of it into your AI coding assistant as its task.

---

## Your role

You build the **Operations** half of the Evoc Ships admin panel: Overview (polish), Merchants, Onboarding & KYC, Shipments and Support. Teammate 2 builds Money, Pricing & couriers and System at the same time. The project moderator reviews, tests and merges every pull request.

## What already exists

The admin panel is at `/admin`, inside the merchant frontend repo (`logistics_Frontend`): Next.js 16 App Router, React 19, Tailwind 4, TypeScript and pnpm.

The foundation is on `main`:
- **Sign-in:** founder-only, at `/admin/login`.
- **Shell:** menu, phone menu, theme switch and sign out.
- **Data:** a typed data service per section, with shared sample data.
- **Pages:** every section page already shows its main list. A **"Still to build here"** card at the bottom lists exactly what is left.

**Overview (`src/app/admin/page.tsx`) is the reference page.** Copy its shape.

Read these before writing any code:
1. `docs/admin/README.md`: setup, security, code layout, how a section is built
2. `docs/admin/team-split.md`: ownership, shared files, contracts, working agreement
3. `docs/admin/backend-needs.md`: why everything is sample data for now
4. `src/app/admin/page.tsx` and `src/app/admin/merchants/page.tsx`
5. `src/lib/admin/data/merchants/` (`types.ts`, `mock.ts`, `gateway.ts`, `index.ts`), the data pattern you will repeat
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
git checkout -b admin/<section>-<feature>    # e.g. admin/merchants-detail
```

## Rules (a PR that breaks one is sent back)

1. **Files you may edit:**
   - your own folders: `src/app/admin/{page.tsx,merchants,onboarding,shipments,support}/**` and `src/lib/admin/data/{overview,merchants,onboarding,shipments,support}/**`;
   - new `e2e/admin-<section>.spec.ts` files;
   - your section's `updatesDoc.md` entry.

   Shared files (`admin-nav.ts`, `admin-shell.tsx`, `status-chip.tsx`, `planned-work.tsx`, `seed.ts`, `common.ts`, `src/lib/admin/session.ts`, `credentials.ts`, `token.ts`) change only with the moderator's agreement. Say so in the PR description. **Never touch** the merchant app (`src/app/(app)`, `(auth)`, `(public)`) or the backend repo (`Evoc_ships`).
2. **Every admin page and server action** starts with `await requireAdminSession()`.
3. **Data:** load it only through the section's service (`adminMerchantsService()` and so on), never by importing `mock.ts` directly. New methods go in the service's `types.ts`, its `mock.ts`, and `gateway.ts` (`notAvailable` until the backend has a route).
4. **Server actions** validate every input on the server, return a plain state object for `useActionState`, and never trust the browser.
5. **No `loading.tsx`** on routes that can answer 404 (detail pages like `/admin/merchants/[id]`) or their parent folders: a loading screen forces status 200. Use `<Suspense>` inside the page after the `notFound()` check instead.
6. **Design:**
   - use the existing building blocks: `PageHeader`, `DataCard`, `StatTile`, `tableStyles`, `EmptyState`, `Dialog` with `PRIMARY_BUTTON`/`SECONDARY_BUTTON`, `StatusChip`, the charts in `src/components/charts`, `CarrierBadge` and `StatusBadge`;
   - colour tokens only (`primary`, `surface`, `on-surface`, `secondary`, `tertiary`, `muted`, `success`, `warning`, `error` …), never raw hex, `bg-white` or `gray-*`;
   - motion by opacity only (`motion-rise`, `motion-stagger`), never translate entrances;
   - money in paise, shown with `formatPaise`; dates with `formatDate` / `formatDateTime`.
7. **Phones and themes:**
   - every page works at 320px, 768px and 1440px, in light and dark, with no sideways scroll;
   - below 1024px, replace wide tables with one card per row;
   - tap targets are at least 44px (`h-11 lg:h-control`).
8. **Accessibility:** one `h1` per page (via `PageHeader`); labels on every field; colour is never the only signal (chips always carry text); dialogs use the shared `Dialog`.
9. **No secrets, no real merchant data,** and never commit `.env.local`.
10. **Docs:**
    - delete each item from the section's `PlannedWork` card as you ship it, and remove the card when the section is complete;
    - add an entry to `updatesDoc.md` for each merged piece.

## Your sections and what "done" means

### 1. Merchants (start here)

**List: `/admin/merchants`**
- Search box (`?q=`), status filter (`?status=active|pending|suspended`), and pagination with the shared `Pagination` component. The service already supports `q`, `status` and `page`, so the URL is the state.
- Phone cards below 1024px.
- Each merchant name links to its detail page; remove the `TODO(Teammate 1)` comment.
- **Done when:** filters survive a reload, an empty result shows `EmptyState`, and pagination keeps the filters.

**Detail: `/admin/merchants/[id]`**
- **Data:** `adminMerchantsService().getMerchant(id)`. On `not_found`, call `notFound()` so the page answers a real 404.
- **Shows:** the profile (email, phone, city, GSTIN, joined), status and KYC chips, shipments by status (`SegmentBar`), notes, and a wallet tile from `adminMoneyService().getMerchantWallet(id)`. **Teammate 2 owns that method; don't change it.**
- **Links:** to this merchant's shipments (`/admin/shipments?merchant=<id>`, once Shipments supports it) and tickets.
- **Done when:** an unknown id answers 404, and each block shows its own error with Try again if its source fails (use `DataCard`).

**Suspend and reactivate**
- Add `setMerchantStatus(id, status, reason)` to the merchants service (types, mock, gateway).
- **Mock:** keep changes in a module-level copy of the sample data, so they last until the server restarts, like the merchant app's mocks.
- **UI:** a button on the detail page opens a `Dialog`. The reason is required (5 to 300 characters). Confirm, then the page shows the new status.
- **Audit:** call `recordAudit(...)` once Teammate 2 publishes it. Until then leave `// TODO(audit)` at the call site.
- **Done when:** the server action rejects a missing or short reason, rejects unknown ids, and suspending twice is harmless.

### 2. Onboarding & KYC

- **Status tabs:** Pending (default), Approved, Rejected, held in `?status=` (service: `listApplications(status)`).
- **Review page `/admin/onboarding/[id]`:** business details, GSTIN and PAN, and each document's kind, file name and size. Show only file names, never file contents. An unknown id answers 404.
- **Decisions:** add `decide(id, 'approved' | 'rejected', reason?)` to the service. Rejecting needs a reason the merchant will see (10 to 500 characters). Approving sets the merchant's KYC to approved and status to active in the shared mock data. After a decision, return to the list with the decision visible. Audit as above.
- **Done when:** an application cannot be decided twice (the second attempt shows a clear message), and the Overview's "KYC waiting" count matches the pending tab.

### 3. Shipments

- **Filters:** search by AWB or merchant (`?q=`), status, merchant (`?merchant=`), stuck only (`?stuck=1`, already used by the Overview link), and pagination. The service already accepts all of these.
- **Detail `/admin/shipments/[awb]`:** merchant, courier, status and the tracking timeline. Reuse the merchant app's tracking pieces if they fit, but don't edit merchant files; copy them into your folder if needed. An unknown AWB answers 404.
- **NDR and RTO views** across all merchants, as tabs on this page. Add service methods with mock data.
- **Phone cards.**
- **Done when:** each filter survives a reload, combined filters work, and `?stuck=1` shows only stuck shipments.

### 4. Support

- **Tabs and filters:** status tabs (Open first, in `?status=`) and a priority filter.
- **Ticket page `/admin/support/[id]`:** the thread (add `getTicket` to the service, with a mock thread), a reply box (add `reply`; 2 to 5,000 characters, plain text only, never rendered as HTML), and status and priority changes. Link to the merchant's page.
- **Phone cards.**
- **Done when:** a reply appears in the thread immediately, a resolved ticket reopens on reply, and an unknown id answers 404.

### 5. Overview (polish, last)

- Link each figure to its section, e.g. "KYC waiting" → `/admin/onboarding`.
- Keep the counts consistent with your sections' mock data.
- It stays the reference page: keep it simple and tidy.

## Tests (part of "done")

- **Unit tests** (Vitest, `*.test.ts` next to the code) for mock filters, input checks and any helper. Run `pnpm test`.
- **Browser tests:** one spec per section, `e2e/admin-<section>.spec.ts`, starting with `await signInAdmin(page)` from `e2e/admin-helpers.ts`. Cover the main flow, an empty state, a 404, and phone width. Run with:
  ```bash
  pnpm build
  pnpm exec playwright test e2e/admin-<section>.spec.ts
  ```
  Do **not** add admin routes to `e2e/routes.ts`; its checks sign in as a merchant.

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

One section, or one feature of a section, per PR.

## Ask the moderator when

- you need a shared file changed;
- you need something from Teammate 2's sections beyond the agreed contracts;
- a backend route would unblock you (add it to `docs/admin/backend-needs.md` in your PR).
