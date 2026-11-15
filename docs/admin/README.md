# Evoc Ships admin panel

The founder's control room for the whole platform: every merchant, new sign-ups and KYC, all shipments, money, pricing, support and system health. It lives inside this frontend at **`/admin`**, built from the same design system as the merchant app (Bento Light and Midnight Glass, the same cards, tables and charts).

- **Users:** one, the founder, so there are no roles or permissions.
- **Status:** the foundation is built. The task split for the two developers is in [team-split.md](team-split.md), and what the backend still needs to provide is in [backend-needs.md](backend-needs.md).

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3100/admin
```

Locally the admin panel uses a demo account, which the sign-in page shows:

- email `admin@evocships.test`
- password `evoc-admin-demo`

## Sign-in and security

| Item | Setting |
|---|---|
| Account | One admin set by environment variables: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (32+ characters). Nothing is stored in a database. |
| Production | All three variables are required. Without them every admin sign-in is refused and the sign-in page says so. The demo account never works in production. |
| Session | Cookie `evoc_admin_session`, signed with HMAC-SHA256 (`src/lib/admin/token.ts`). It is httpOnly, `SameSite=Strict`, scoped to `/admin` and lasts 8 hours. It is separate from the merchant cookies, so a merchant sign-in never opens the admin panel. |
| Page guard | Every admin page calls `await requireAdminSession()` first, which redirects to `/admin/login`. The layout does **not** redirect, so a missing page still answers 404. Do not add `loading.tsx` to routes that can 404, for the same reason (see the merchant app's Readme). |
| Search engines | The admin layout sets `noindex, nofollow`. |
| Recommended for deployment | Put `/admin` behind an IP allow-list or VPN at the host or proxy. Add rate limiting to the sign-in action before going live. |

## Code layout

| Path | What it holds |
|---|---|
| `src/app/admin/layout.tsx` | Shell when signed in; bare page otherwise |
| `src/app/admin/login/` | Sign-in page and form |
| `src/app/admin/actions.ts` | Sign-in and sign-out server actions |
| `src/app/admin/page.tsx` | **Overview: the reference page.** Copy its shape. |
| `src/app/admin/<section>/page.tsx` | One folder per section: merchants, onboarding, shipments, money, pricing, support, system |
| `src/components/admin/` | `admin-shell.tsx` (menu, top bar, phone menu), `admin-nav.ts` (sections and owners), `status-chip.tsx`, `planned-work.tsx` |
| `src/lib/admin/` | `credentials.ts`, `token.ts` (+ tests) and `session.ts` (`getAdminSession`, `requireAdminSession`) |
| `src/lib/admin/data/<module>/` | `types.ts`, `mock.ts`, `gateway.ts` and `index.ts` per module, the same pattern as the merchant app |
| `src/lib/admin/data/seed.ts` | Sample merchants shared by every module's mock data, so names and figures agree across pages |
| `src/lib/admin/data/common.ts` | `Page<T>`, `paginate()`, `matchesQuery()` |

## How a section is built

1. **Data first.** Add or extend the module's `types.ts` (interfaces and the service methods), then `mock.ts` (sample data built from `seed.ts`) and `gateway.ts` (`notAvailable` until the backend has a route).
2. **Page.** `requireAdminSession()`, then `PageHeader`, then a `DataCard` per data result (it shows the Sample badge and errors), with `StatTile` figures, charts from `src/components/charts` and tables with `tableStyles`.
3. **Actions.** Write server actions next to the page (`actions.ts`). Each one calls `requireAdminSession()` again, validates its input on the server, and returns a plain state for `useActionState`.
4. **Phone.** Below 1024px, show cards instead of wide tables. Tap targets are at least 44px (`h-11 lg:h-control`).
5. **Tests.** Unit-test the logic: mock filters, input checks, formatting. Browser specs for admin go in `e2e/admin-<section>.spec.ts` and start with `signInAdmin(page)` from `e2e/admin-helpers.ts`. `e2e/admin.spec.ts` already covers sign-in, the page guard, the menu and every section loading. The main e2e server (port 3101) is started with a test admin account (`testAdmin` in `playwright.config.ts`). Admin routes are **not** added to `e2e/routes.ts`, whose checks sign in as a merchant.
6. **Docs.** Update `updatesDoc.md` and delete the section's items from its `PlannedWork` card as they ship. Remove the card when the section is done.

Data sources switch per module with `DATA_SOURCE_ADMIN_<MODULE>=gateway|mock`, for example `DATA_SOURCE_ADMIN_MERCHANTS=gateway`. The default is `mock`.

## Design rules

These are the same as the merchant app: tokens only (no raw colours), Plus Jakarta Sans and Geist Mono, 10px controls and 16px cards, and motion by opacity and clip-path only. Everything must work in light and dark at 320px, 768px and 1440px wide. Money is always handled in paise and shown with `formatPaise`.
