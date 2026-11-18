# Admin panel integration report (2026-11-18)

This report is for the moderator and both teammates. It covers what was merged, how it was tested, what was fixed during integration, and what must still change before the backend engineer connects real APIs.

## What was merged

Branch `integration/admin`, from `main` (`4d82b77`, the admin foundation), merged with `--no-ff` so every teammate commit keeps its author.

| Branch | Author | Contents |
|---|---|---|
| `admin/overview` | toufeeqsk69 (Teammate 1) | Stacked. Contains `admin/merchants`, `admin/onboarding`, `admin/shipments` and `admin/support`. Covers Merchants, Onboarding & KYC, Shipments, Support and the Overview polish. |
| `admin/money-wallets` | SaiManideep-Git (Teammate 2) | Built on `admin/system-audit`. Wallet adjustments, ledger, COD remittances, exceptions, overdue view. Includes the audit log and `recordAudit()`. |
| `admin/pricing-couriers` | SaiManideep-Git | Built on `admin/system-audit`. Couriers on and off, rate edits, filters, zones, per-merchant prices. |
| `admin/system-health` | SaiManideep-Git | Built on `admin/system-audit`. Health refresh, a gateway health call, failed webhook retries. |

There were no merge conflicts. Every change stays inside `src/app/admin`, `src/lib/admin` and `e2e/admin-*`, apart from `updatesDoc.md`, plus one new shared component added during integration (`src/components/admin/load-error.tsx`).

## Checks on the integrated branch

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm lint` | Pass, 0 warnings |
| `pnpm typecheck` | Pass |
| `pnpm test` | 111 files, 1,080 tests passed |
| `pnpm build` | Pass |
| `pnpm exec playwright test e2e/admin --project=desktop --project=phone` | 186 passed, 0 failed, 12 skipped (desktop-only and phone-only checks, and data-changing tests that run once on desktop) |
| Manual browser pass of every admin page (14 pages, including detail pages) | Light and dark desktop, phone and 320px on a production build: all answer 200, no sideways scroll, one `h1` each, no browser errors. Paging moves to page 2, and the merchant page links filter correctly. |
| Read-only code review of the whole diff | Done; findings below |

**Checked and fine:**
- **Sign-in guard:** every admin page and every server action calls `requireAdminSession()` first.
- **Inputs:** all are validated on the server.
- **Money:** handled as integer paise, parsed on the server.
- **Safety:** no `dangerouslySetInnerHTML` and no secrets.
- **Client and server code:** browser components import only types and pure helpers.
- **404 handling:** there are no `loading.tsx` files under admin, and every detail page calls `notFound()` for unknown ids.
- **Module structure:** every module keeps `types` / `mock` / `gateway` / `index`, and every service method has a gateway implementation.
- **Shared contract:** the cross-team `getMerchantWallet()` contract holds.

## Fixed during integration

1. **Personal file paths in tests:** `e2e/admin.spec.ts` and `e2e/admin-support.spec.ts` saved screenshots to `C:/Users/toufe/.gemini/...`, which breaks on every other machine. Those screenshot-only tests were removed.
2. **Audit log wired up:** merchant suspend, activate and reactivate, KYC approve and reject, ticket replies, and ticket status and priority changes now call `recordAudit()`. They were `TODO(audit)` because each teammate's branch predated the other's.
3. **Raw colours:** `text-white` and `bg-white/20` in Onboarding and Shipments now use the `on-primary` token.
4. **Pagination never moved:** Support, Shipments and Merchants kept the page number in component state, so a Next link changed the URL but not the rows. The views are now keyed by the URL, and Support reads `?page=`.
5. **Support "All" tab:** it fell back to Open on reload or paging. `status=all` is now written to the URL.
6. **Broken links on the merchant page:**
   - "View all shipments" used `?merchant=` but Shipments reads `?merchantId=`.
   - "KYC & Onboarding" linked to `/admin/onboarding/<merchant id>`, which 404s for most merchants and would 404 for every merchant with a real API. It now opens the applications list searched by merchant id; Onboarding reads `?q=`.
7. **Backend-unavailable handling on detail pages:**
   - Onboarding and Shipments detail pages threw on any error except not-found, crashing to the global error page once switched to the backend.
   - The Support ticket page turned any error into a false 404.
   - All three now show the error with Try again (`AdminLoadError`) and 404 only on a real not-found.
8. **Support page used sample data directly:**
   - The ticket page read merchant contact details from the sample seed. It now asks the merchants service.
   - The inbox hid load errors and had no Sample badge. It is now wrapped in `DataCard`.
9. **Wallet balances disagreed:** the merchants list showed a fixed balance while the merchant page and Money showed the live one. The merchants sample data now reads balances from the Money service, which owns them.
10. **Tests that depended on running order:** desktop and phone runs share one sample-data server.
    - Teammate 1's tests that change data (KYC decisions, merchant status, ticket replies) now run once, on desktop, on fixed records. Display tests no longer depend on records another test changes.
    - The shipments filter test picked "the first merchant", which became a merchant with no shipments. It now picks `mer_001`.

## Must change before connecting the real backend (owner: Teammate 1)

**Lists filtered in the browser.** Merchants, Shipments (including NDR and RTO), Onboarding and Support load one batch on the server, then search, filter and page it in the browser:
- merchants: `listMerchants({})` returns only page 1 of 10;
- shipments: `pageSize: 100`;
- NDR and RTO: page 1 only;
- Onboarding and Support: the whole list.

The merchant pickers in Shipments filters and the Pricing per-merchant form (Teammate 2) also only offer page 1.

This works on sample data, but with real data it shows incomplete lists and wrong counts. **Fix:** make the URL the state and let the server filter and page:
1. the page reads `q`, status and `page` from `searchParams`;
2. it calls the service with them and renders that page;
3. the browser view only updates the URL (keep the debounce).

The services already accept these parameters. Give `listApplications` and `listTickets` a `Page<T>` result like the others, and use a merchant search box instead of a full dropdown.

## Smaller follow-ups

| Item | Owner |
|---|---|
| `setMerchantStatus` accepts any status. Restrict transitions on the server: don't activate a merchant whose KYC isn't approved, and don't set an active merchant back to pending. | Teammate 1 |
| The rejected sample application uses `merchantId: 'mer_x01'`, which isn't in the seed, so "View merchant" 404s. Use a seed merchant. | Teammate 1 |
| Overview sample figures are fixed: wallet float ₹1,73,100 versus ₹1,74,300 summed in Money, and active and suspended counts don't change after a suspension. Derive them from the services. | Teammate 1 |
| Sample modules read each other's in-memory state (onboarding changes merchants, overview reads onboarding). With mixed `DATA_SOURCE_ADMIN_*` settings they drift. This is expected; note it for the backend engineer. | Both |
| `e2e/admin-system.spec.ts` uses a fixed 1.1 s wait. Use `expect.poll` instead. | Teammate 2 |

## Backend readiness verdict

- **Ready (structure):** every module has a typed service with a gateway implementation (`notAvailable`, or a real zod-checked call for health). Switching `DATA_SOURCE_ADMIN_<MODULE>=gateway` shows "not available" messages instead of crashing. Error results flow through `DataResult`.
- **Not ready (data flow):** the list screens above must move to server-side filtering and paging first, or real data will appear incomplete.
- **Backend team:** the routes still needed are listed in [backend-needs.md](backend-needs.md).
