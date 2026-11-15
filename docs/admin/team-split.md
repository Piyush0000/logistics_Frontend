# Admin panel: who builds what

Two developers each build their own sections. The moderator (project lead) reviews, tests and merges. Start from **`main`** (the foundation is merged there). Every section already has a page that loads sample data, a typed data service, and a "Still to build here" card listing the remaining work.

Read [README.md](README.md) first. It covers how to run the panel, sign in and build a section.

**Each teammate's full brief** (rules, every task with what "done" means, tests and the PR checklist), written so it can also be pasted into an AI coding assistant:
- Teammate 1: [prompts/teammate-1-operations.md](prompts/teammate-1-operations.md)
- Teammate 2: [prompts/teammate-2-money-platform.md](prompts/teammate-2-money-platform.md)

## Teammate 1: Operations (merchants and their shipments)

| Section | Route | Files you own | Build |
|---|---|---|---|
| Overview | `/admin` | `src/app/admin/page.tsx`, `src/lib/admin/data/overview/` | Polish only: it is the reference page and already works. Link each figure to its section. Make the date range real once the backend has stats. |
| Merchants | `/admin/merchants`, `/admin/merchants/[id]` | `src/app/admin/merchants/`, `src/lib/admin/data/merchants/` | Search, status filter and pagination. Detail page: profile, shipments by status, wallet tile (call `adminMoneyService().getMerchantWallet(id)`, which Teammate 2 owns), notes. Suspend and reactivate with a reason. Phone cards. |
| Onboarding & KYC | `/admin/onboarding`, `/admin/onboarding/[id]` | `src/app/admin/onboarding/`, `src/lib/admin/data/onboarding/` | Status tabs. Review page with business details and documents. Approve, or reject with a required reason. Phone cards. |
| Shipments | `/admin/shipments`, `/admin/shipments/[awb]` | `src/app/admin/shipments/`, `src/lib/admin/data/shipments/` | Filters (search, status, merchant, stuck), pagination, detail with timeline, NDR and RTO tabs. Phone cards. |
| Support | `/admin/support`, `/admin/support/[id]` | `src/app/admin/support/`, `src/lib/admin/data/support/` | Status tabs and priority filter. Ticket page with the thread, reply, and status and priority changes. Link to the merchant. Phone cards. |

## Teammate 2: Money and platform

| Section | Route | Files you own | Build |
|---|---|---|---|
| Money | `/admin/money` (and sub-pages you add) | `src/app/admin/money/`, `src/lib/admin/data/money/` | Summary figures. Wallet adjustment (credit or debit with a reason, confirmed in a Dialog). Per-merchant ledger. COD remittance detail, reconcile and verify-bank. Exceptions list with resolve. Overdue COD. Phone cards. **Keep `getMerchantWallet(merchantId)` working: Teammate 1's merchant page uses it.** |
| Pricing & couriers | `/admin/pricing` | `src/app/admin/pricing/`, `src/lib/admin/data/pricing/` | Turn couriers on and off. Edit rate card rows with validation. Filter by courier and zone. Per-merchant overrides. Zone reference. |
| System | `/admin/system` | `src/app/admin/system/`, `src/lib/admin/data/system/` | Live health checks. Webhook delivery failures with retry. **The audit log: add a `recordAudit()` helper early.** Teammate 1 calls it from merchant status and KYC actions, and you call it from wallet and rate actions. Audit log filters. |

## Shared files (change only through the moderator)

These files are used by both teammates. Keep changes to them small, mention them in your PR description, and expect the moderator to merge them first.

- `src/components/admin/admin-nav.ts`: the menu. Only add an entry when you add a new top-level section.
- `src/components/admin/admin-shell.tsx`, `status-chip.tsx` and `planned-work.tsx`.
- `src/lib/admin/data/seed.ts` and `common.ts`: the shared sample merchants and list helpers. Add fields rather than renaming existing ones.
- `src/lib/admin/session.ts`, `credentials.ts` and `token.ts`: sign-in and security. Don't change these without the moderator.
- Anything outside `src/app/admin`, `src/components/admin` and `src/lib/admin`. The merchant app is not part of this work.

## Cross-team contracts

| Contract | Owner | Used by | Rule |
|---|---|---|---|
| `adminMoneyService().getMerchantWallet(merchantId)` | Teammate 2 | Teammate 1, on the merchant detail page | Signature fixed as in `money/types.ts` |
| `recordAudit({ action, target, detail })` | Teammate 2 adds it in `src/lib/admin/data/system/` | Both, from every admin action | Teammate 2 publishes the signature in the first PR. Until then Teammate 1 leaves a `// TODO(audit)` comment at each action. |
| Merchant ids (`mer_001` …) and names | `seed.ts` (shared) | Every mock | Mocks read merchants from `seed.ts`; never copy names into a module |

## Working agreement

1. **Branches:** one per section, from an up-to-date `main`, named `admin/<section>`, e.g. `admin/merchants` or `admin/money-wallets`. Open the PR into `main`. Keep PRs small: one section, or one feature of a section. Before opening it, run `git pull origin main` to bring your branch up to date.
2. **Before opening a PR:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
   If you added a spec: `pnpm build`, then `pnpm exec playwright test e2e/admin-<section>.spec.ts`.
3. **In the PR description:** what changed, screenshots at phone and desktop width in light and dark, and any shared file you touched.
4. **Never** commit `.env.local`, real merchant data or credentials.
5. **Backend:** don't change the backend (`Evoc_ships`). If you need a route, add it to [backend-needs.md](backend-needs.md) and keep using `mock` until it exists.

## Suggested order

| Week | Teammate 1 | Teammate 2 |
|---|---|---|
| 1 | Merchants list (filters, pagination, phone), then merchant detail | `recordAudit()` + audit log, then wallets with adjustments |
| 2 | Onboarding review with approve and reject | COD remittances, reconcile, exceptions |
| 3 | Shipments filters, detail, NDR and RTO tabs | Pricing: couriers on and off, rate edits |
| 4 | Support inbox and ticket page; Overview polish | System health, webhook failures; Money summary |
