# Evoc Ships Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 41 screens the new Evoc Ships identity (light "Bento Light", dark "Midnight Glass"), add Smart insights, Needs you today, ⌘K and phone navigation, and make pages faster, without changing behaviour.

**Architecture:** Swap the existing Tailwind colour tokens to CSS variables that change with `data-theme`, restyle shared components once so every screen inherits, move the shell into the `(app)` layout so it stays mounted, then polish module by module.

**Tech Stack:** Next.js 16.4.5 App Router, React 19, Tailwind 4, TypeScript 5.9, `next/font/google`, lucide-react. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-evoc-ships-redesign-design.md` (read it first; it holds every colour value, the logo geometry and the motion timings this plan refers to). Visual reference: `docs/superpowers/specs/assets/2026-11-14-directions-v2.html` (D and E).

## Global Constraints

- Branch `feature/redesign` (already created, `e799a09`). Commit after each task. Never push. Never commit `.superpowers/`.
- Only `D:\EvocLogistics\logistics_Frontend` changes. `git -C ../Evoc_ships status --porcelain` stays empty at `aace603`.
- **No test suites are run** (user's rule). Each task ends with `pnpm typecheck` and `pnpm lint` (0 errors, 0 warnings). Phase ends add `pnpm build`. Screenshots via `node scripts/screenshots.mjs` (after `pnpm build`; in Git Bash prefix `MSYS_NO_PATHCONV=1`).
- Keep stable: routes, form field `name`s, server actions, `data-testid`s, accessible names, roles, headings, nav labels and hrefs. When visible text a test asserts must change, update the assertion in `e2e/` or `src/**/*.test.ts` in the same commit (find with `grep -rn`), without running it, and list it in `updatesDoc.md`.
- Brand name is "Evoc Ships". Colours only through tokens (`primary`, `on-primary`, `surface`, `on-surface`, `secondary`, `tertiary`, `muted`, `accent`, `success`, `warning`, `error`); no raw hex in `.tsx` except the logo SVG.
- Fonts: Plus Jakarta Sans (400–800) and Geist Mono (400, 500) only.
- Motion: 150ms presses/hovers, 250ms panels, ≤700ms chart entrances, easing `cubic-bezier(.2,.8,.2,1)`; everything off under `prefers-reduced-motion: reduce`.
- Phone navigation below 64rem (`lg`); dark glass from 48rem (`md`).
- "Sample data" badges stay wherever they are today.
- Update `Readme.md` and `updatesDoc.md` at the end of each phase (Tasks 6, 10, 17, 18).

## Review Focus

1. **Theme flash / hydration mismatch:** a dark-mode user must never see a white flash or a React hydration warning on first load. Task 1 adds `--dark` screenshots and checks the browser console in dev-smoke-style load (Task 1 Step 6).
2. **Unreadable text on coloured fills in dark mode:** every former `text-tertiary`/`border-tertiary` sitting on `bg-primary`/`bg-accent` must become `on-primary`. Task 1 Step 3 greps for leftovers; Task 18 screenshots both themes.
3. **Double shell or missing shell:** after the shell moves to the layout, no page or `error.tsx` may render `<AppShell>` again, and `not-found`/`error` inside `(app)` still show the menu. Task 3 Step 6 greps for `<AppShell` (expected: only the layout).
4. **Bottom tab bar covering content:** sticky action bars, dialogs-as-sheets, pagination and the last table row must stay reachable above the tab bar and the iPhone home indicator. Task 3 adds bottom padding equal to the bar height plus `env(safe-area-inset-bottom)`; Task 10 phone screenshots check it.
5. **Tests silently broken by copy changes:** brand name, headings or labels changed without updating assertions. Task 2 Step 2 and every module task's last step grep `e2e/` and `src/**/*.test.ts` for changed strings.

---

## Phase 1: Foundation

### Task 1: Theme tokens, fonts and theme switch

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `scripts/screenshots.mjs`
- Create: `src/lib/theme.ts`, `src/components/theme/theme-script.tsx`, `src/components/theme/theme-toggle.tsx`
- Modify (audit): every `.tsx` using `text-tertiary` / `border-tertiary` on a coloured fill

**Interfaces:**
- Produces: `type ThemePreference = 'light' | 'dark' | 'system'`; `THEME_STORAGE_KEY = 'evoc-theme'`; `readThemePreference(): ThemePreference` and `applyThemePreference(p: ThemePreference): void` (client helpers in `src/lib/theme.ts`); `<ThemeScript />` (server component rendering the inline pre-paint `<script>`); `<ThemeToggle variant="menu" | "icon" />` (client).
- Produces CSS: token `--color-on-primary`; utility classes `glass` (dark ≥48rem translucent card, else solid `surface`), `motion-rise` (fade-up 250ms), `motion-stagger` (children delay by `--i` × 50ms), `motion-grow` (scaleY from baseline, 700ms).

- [ ] **Step 1:** In `globals.css`, replace the fixed `@theme` colours with `@theme inline` entries pointing at variables (`--color-primary: var(--c-primary)` etc., plus `--color-on-primary`), and define `--c-*` under `:root, [data-theme='light']` and `[data-theme='dark']` with the exact values from the spec's colour table. Dark `body` background: `tertiary` plus two radial glows (`#183EEB` at 80% -10%, `#112CAB` at 0% 110%, ~30% alpha). Add the motion tokens and the `glass`/`motion-*` classes. Make `.theme-auth` and `.theme-app` share one set: radius control 10px, card 16px, control height 44px (36px at `min-width:64rem` and `pointer:fine`), card padding 16px/24px. Font variables: `--theme-font-heading/display/body` all → `var(--font-jakarta)`; add `--font-mono: var(--font-geist-mono)` to `@theme inline`.
- [ ] **Step 2:** In `layout.tsx`, swap Manrope/Inter/IBM Plex for `Plus_Jakarta_Sans` (`variable: '--font-jakarta'`, weights 400–800) and `Geist_Mono` (`variable: '--font-geist-mono'`, 400/500); add `suppressHydrationWarning` to `<html>`; render `<ThemeScript />` first in `<head>`; `viewport.themeColor` becomes `[{ media: '(prefers-color-scheme: light)', color: '#EEF0F5' }, { media: '(prefers-color-scheme: dark)', color: '#070B16' }]`; metadata title "Evoc Ships".
- [ ] **Step 3:** The inline script: read `localStorage['evoc-theme']` in try/catch, resolve `system` with `matchMedia('(prefers-color-scheme: dark)')`, set `document.documentElement.dataset.theme`. `applyThemePreference` writes storage, sets the attribute, and while on `system` listens to the media query. Then audit: `grep -rn "text-tertiary\|border-tertiary" src --include=*.tsx`; each one on a `bg-primary`/`bg-accent`/`bg-error`/`bg-success` element becomes `text-on-primary` / `border-on-primary`. Re-run the grep; remaining hits must be on non-filled backgrounds (list them in the commit message).
- [ ] **Step 4:** `ThemeToggle`: `menu` variant = three-option radio group (Light, Dark, System, accessible name "Theme"); `icon` variant = one button cycling light → dark → system with `aria-label="Theme: <current>"`.
- [ ] **Step 5:** `scripts/screenshots.mjs`: add a `--dark` flag that creates each context with `colorScheme: 'dark'` and suffixes files `-dark`.
- [ ] **Step 6:** `pnpm typecheck && pnpm lint` → exit 0. `pnpm dev`, open `/login` with the OS in dark mode: no white flash, no hydration warning in the console.
- [ ] **Step 7:** Commit `feat(theme): light and dark Evoc Ships tokens, fonts and theme switch`.

### Task 2: Brand mark and name

**Files:**
- Modify: `src/components/brand-mark.tsx`; every file containing "Evoc Logistics" (45 files across `src/` and `e2e/`)
- Create: `src/app/icon.svg`

**Interfaces:**
- Produces: `BrandMark({ compact?: boolean; onDark?: boolean })`: full logo (SVG block + bars + "Evoc Ships" wordmark text) or compact (block + bars, `role="img"`, `aria-label="Evoc Ships"`). `onDark` forces the light wordmark colour (`#E6EBF7`); otherwise the wordmark uses `text-on-surface`.

- [ ] **Step 1:** Draw the SVG from the spec's measured geometry (viewBox `0 0 456 280` for the mark: block 0–303 × 0–279 with top radius 35, band y 210–279, bars x 351–455 at y 82–116 and 164–197). Wordmark as text in Plus Jakarta Sans 700. Remove the "Placeholder logo" line. `icon.svg` = compact mark.
- [ ] **Step 2:** `grep -rln "Evoc Logistics" src e2e` → replace with "Evoc Ships" in every hit (titles, aria-labels, copy, assertions). Re-grep → 0 hits. Also grep `"Placeholder logo"` in `e2e/` and remove/adjust those assertions.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 4:** Commit `feat(brand): Evoc Ships logo and name everywhere`.

### Task 3: Shell in the layout, new sidebar, top bar and phone tab bar

**Files:**
- Modify: `src/app/(app)/layout.tsx`, `src/lib/auth/session.ts`, `src/components/shell/{app-shell,sidebar,top-bar,awb-search,nav-config}.tsx|ts`, the 35 files that render `<AppShell>` (list: `grep -rl "<AppShell" src/app`), `src/app/(app)/error.tsx`
- Create: `src/components/shell/{wallet-chip.tsx,wallet-chip-view.tsx,wallet-actions.ts,bottom-tabs.tsx}`, `src/app/(app)/loading.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` (Task 1), `BrandMark` (Task 2).
- Produces: `AppShell({ email: string; wallet: ReactNode; children: ReactNode })` (wallet is now a slot); `WalletChip()` async server component; `WalletChipView({ initial: DataResult<WalletBalance> })` client; `refreshWalletBalance(): Promise<DataResult<WalletBalance>>` server action (`'use server'`, checks the demo session like other actions); `BottomTabs()` client; `getDemoSession` wrapped in React `cache()` (same signature).
- Produces: `NavGroup` gains optional `section?: 'Main' | 'Operations' | 'Money' | 'Tools' | 'Account'` (builder picks the mapping; labels/hrefs unchanged).

- [ ] **Step 1:** `session.ts`: export `getDemoSession = cache(async () => …)` with identical behaviour.
- [ ] **Step 2:** `(app)/layout.tsx`: get the session; if none `redirect('/login')`; render `<ShellIdentityProvider>` → `<div className="theme-app font-body">` → `<AppShell email wallet={<Suspense fallback={<wallet skeleton/>}><WalletChip /></Suspense>}>{children}</AppShell>`.
- [ ] **Step 3:** In each of the 35 pages: remove the `<AppShell>` wrapper, its import, and the `walletService().getBalance()` call when it was only for the shell (keep it where the page itself shows the balance, e.g. `finances/wallet`). Keep each page's own `if (!session) redirect('/login')`. `error.tsx` renders only its content.
- [ ] **Step 4:** Restyle per the spec "Shell" section: sidebar sections with headings, ⌘K hints, active item (light: `bg-muted text-primary`; dark: left glow bar), collapse kept; top bar with ⌘K search field (still submits the comma-separated AWB lookup it does today), wallet slot, user menu with `ThemeToggle variant="menu"` and sign out. "Refresh balance" calls `refreshWalletBalance` and updates `WalletChipView` state (no `router.refresh()`).
- [ ] **Step 5:** `BottomTabs` (shown below `lg`): Home `/home`, Shipments `/orders`, Create `/orders/create` (raised centre button), Wallet `/finances/wallet`, More (opens the existing slide-in menu via the same state `AppShell` uses). Active indicator slides (250ms). The content area gets `padding-bottom: calc(4rem + env(safe-area-inset-bottom))` below `lg`. `(app)/loading.tsx` renders a content-area skeleton only.
- [ ] **Step 6:** `grep -rn "<AppShell" src/app` → only `(app)/layout.tsx`. `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 7:** Commit `feat(shell): persistent Evoc Ships shell with phone tab bar and streaming wallet`.

### Task 4: Building blocks and motion components

**Files:**
- Modify: `src/components/ui/{data-card,stat-tile,page-header,field-styles,select-field,date-field,dialog,empty-state,status-panel,pagination,copy-button}.tsx|ts`, `src/components/sample-badge.tsx`, `src/components/orders/{status-badge,carrier-badge}.tsx`
- Create: `src/components/ui/{loader,skeleton,animated-number,table-styles}.tsx|ts`

**Interfaces:**
- Produces: `Loader({ label?: string; size?: 'sm' | 'md' })` (the "=" bars, `role="status"`); `Skeleton({ className?: string })`; `AnimatedNumber({ value: number; format?: (n: number) => string })` client, counts up once on first view (IntersectionObserver), renders the final value immediately under reduced motion and on the server; `tableStyles` = `{ wrap, table, th, td, tdNumeric, rowHover }` class strings.
- Produces: `StatTile` keeps `{ label, value, icon, testId? }` and adds `tone?: 'primary' | 'success' | 'warning' | 'accent' | 'error'`, `delta?: { text: string; good: boolean; direction: 'up' | 'down' | 'flat' }`, `spark?: number[]`. Two-tone number when `value` is a string with a separator (leading group full colour, rest `/40`), Geist Mono.
- `Dialog`: same props; below `lg` it renders as a bottom sheet (slides up 250ms, drag handle, max-height 90dvh, same focus trap and Escape).

- [ ] **Step 1:** Restyle each component per the spec "Building blocks" section using `glass`, `motion-rise` and the radius tokens. Buttons in shared styles get pressed (`active:scale-[.97]`) and focus states.
- [ ] **Step 2:** Status chips: filled tint in light (`bg-success/15 text-success`), outlined in dark (`[data-theme=dark]_&:` border variant). Cross-fade on change (`transition-colors 250ms`).
- [ ] **Step 3:** `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 4:** Commit `feat(ui): restyled building blocks, loader, skeleton and animated numbers`.

### Task 5: Charts

**Files:**
- Modify: `src/components/charts/bar-chart.tsx`
- Create: `src/components/charts/{gauge,sparkline,line-chart,segment-bar,fill-meter}.tsx`

**Interfaces:**
- Produces (all server components, SVG, each with an `sr-only` text or table equivalent like `bar-chart.tsx`): `Gauge({ value: number /* 0–100 */; label: string; testId?: string })`; `Sparkline({ points: number[]; label: string; tone?: Tone })`; `LineChart({ title: string; labels: string[]; series: { name: string; points: number[]; tone: Tone }[] })`; `SegmentBar({ title: string; segments: { label: string; value: number; tone: Tone }[] })`; `FillMeter({ percent: number; label: string })`. `type Tone = 'primary' | 'success' | 'warning' | 'accent' | 'error'` exported from `src/components/charts/tone.ts`.

- [ ] **Step 1:** Load the `dataviz` skill. Restyle `bar-chart.tsx` (rounded tops, `motion-grow` with stagger, token colours) keeping its props, label logic and NaN guard. Build the five new charts; clamp inputs (NaN → 0, `value` to 0–100); entrance animations drawn with `stroke-dashoffset` / `scaleY`, off under reduced motion.
- [ ] **Step 2:** `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 3:** Commit `feat(charts): gauge, sparkline, line, segment and fill charts in Evoc Ships style`.

### Task 6: Performance clean-up and Phase 1 check

**Files:**
- Modify: the 17 client files listed in the spec's Performance item 5 (from the audit: weight ×3, weight-settings ×2, company ×2, courier-rules ×2, profile, sub-merchants, tracking-page, team ×2, support ×3); `src/lib/data/team/{types,mock,index}.ts`; every `src/lib/data/*/{index,gateway,mock}.ts`; `src/app/(app)/tools/rate-card/{page,rate-filter}.tsx` and other client importers of `@logicore/contracts` (`grep -rln "@logicore/contracts" src --include=*.tsx` then keep only `'use client'` files); `src/app/(app)/orders/create/create-form.tsx`; `Readme.md`; `updatesDoc.md`

- [ ] **Step 1:** Client files import runtime values from `<feature>/types` or `<feature>/input`, never `<feature>/index`. Move `LAST_ADMIN_MESSAGE` to `team/types.ts` (mock and index re-import it).
- [ ] **Step 2:** Add `import 'server-only';` at the top of every feature `index.ts`, `gateway.ts` and `mock.ts`. `pnpm typecheck` must still pass; a client import of an index would now fail the build, which is the point.
- [ ] **Step 3:** Client components that import `CARRIERS` from `@logicore/contracts` receive `carriers: readonly string[]` as a prop from their server page instead.
- [ ] **Step 4:** `create-form.tsx`: replace `window.location.reload()` with a state reset (clear the form and result) so "Book another" stays on the page.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint && pnpm build` → all exit 0. `grep -c "Meera Nair" -r .next/static` → 0.
- [ ] **Step 6:** Update `Readme.md` (design system section: new tokens, fonts, themes; brand; remove the Sharkship/MCW split) and `updatesDoc.md` (Phase 1 entry: what changed, assertions edited without running, "tests not run per user").
- [ ] **Step 7:** Commit `perf: keep sample data and contracts out of the browser; docs for phase 1`.

## Phase 2: Home, Dashboard, insights, ⌘K

### Task 7: Smart insights

**Files:**
- Create: `src/lib/insights/{types.ts,rules.ts,index.ts,rules.test.ts}`

**Interfaces:**
- Produces: `Insight { id: string; tone: 'action' | 'warning' | 'good' | 'info'; title: string; detail: string; href: string; isSample: boolean }`.
- `InsightInput { summary?: DataResult<ShipmentSummary>; ndr?: DataResult<NdrDashboardData>; weight?: DataResult<WeightSummary>; cod?: DataResult<CodSummary>; wallet?: DataResult<WalletBalance>; pickups?: DataResult<{ items: Pickup[] }>; onboarding?: DataResult<OnboardingItem[]>; today: string /* YYYY-MM-DD, India time */ }`.
- `buildInsights(input: InsightInput): Insight[]` (pure; order: action, warning, info, good; max 6). `needsYouToday(insights: Insight[]): Insight[]` (tones action and warning). `getInsights(): Promise<Insight[]>` in `index.ts` (`server-only`; fetches the services in parallel with `Promise.all`, calls `buildInsights`).
- Rules (a result with `ok: false` skips its rule; `isSample = source === 'mock'`):
  - `ndr-open`: `openNdr > 0` → action, "{n} NDRs need an answer", href `/ndr`.
  - `weight-open`: `open + disputed > 0` → action, detail shows `formatPaise(extraChargePaise)` at stake, href `/reconciliation/weight`.
  - `onboarding-left`: any `done === false` → action, "{n} setup steps left", href of the first undone item.
  - `wallet-low`: `availablePaise < 50_000` → warning, href `/finances/wallet`.
  - `rto-high`: `rto / (delivered + rto) > 0.15` with `delivered + rto ≥ 20` → warning, href `/rto`.
  - `pickups-today`: scheduled pickups with `pickupDate === today` → info, href `/orders/pickups`.
  - `cod-next`: `nextBatchPaise > 0` → info, "{amount} in your next COD payout", href `/finances/cod`.
  - `all-clear`: no action or warning insight → good, "Nothing needs you right now", href `/orders`.

- [ ] **Step 1:** Write `rules.test.ts` (not run, per user): one test per rule for fire / not fire, one for `ok: false` skip, one for ordering and the max of 6, one for `isSample`.
- [ ] **Step 2:** Implement `rules.ts` and `index.ts`.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 4:** Commit `feat(insights): smart insights from existing shipment, NDR, weight, COD and wallet data`.

### Task 8: ⌘K command search

**Files:**
- Create: `src/components/shell/{command-items.ts,command-palette.tsx}`
- Modify: `src/components/shell/{app-shell,top-bar}.tsx`

**Interfaces:**
- Consumes: `NAV` from `nav-config.ts`, `Dialog` (Task 4, sheet on phones).
- Produces: `Command { id: string; label: string; group: 'Go to' | 'Actions' | 'Track'; href: string; keywords?: string[] }`; `buildCommands(nav: NavGroup[]): Command[]` (live items only); `filterCommands(commands: Command[], query: string): Command[]` (case-insensitive match on label and keywords; when the query looks like an AWB per `parseAwbQuery` from `src/lib/awb.ts`, prepend `{ group: 'Track', label: 'Track <awb>', href: '/tools/tracking?awb=<encoded query>' }`); `<CommandPalette />`.
- Actions: Create shipment `/orders/create`, Bulk upload `/orders/bulk`, Recharge wallet `/finances/wallet`, New ticket `/support/tickets?new=1`, Track a shipment `/tools/tracking`.

- [ ] **Step 1:** Implement; open with ⌘K / Ctrl+K (ignore while typing in another field unless it's the top-bar search), the top-bar search icon on phones, and a "⌘K" button in the top bar on desktop. Listbox semantics: input `role="combobox"`, results `role="listbox"`, arrows/Enter/Escape, `aria-activedescendant`.
- [ ] **Step 2:** `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 3:** Commit `feat(shell): command search with screens, actions and AWB tracking`.

### Task 9: Home redesign

**Files:**
- Modify: `src/app/(app)/home/{page,stat-card,quick-actions,recent-shipments,onboarding-checklist}.tsx`
- Create: `src/app/(app)/home/{insights-panel,needs-you-today}.tsx`

**Interfaces:**
- Consumes: `getInsights`, `needsYouToday` (Task 7); `StatTile`, `AnimatedNumber`, `Skeleton` (Task 4); `Gauge`, `FillMeter`, `BarChart` (Task 5).

- [ ] **Step 1:** Bento layout per the spec "Screens → Home" and preview D: greeting; KPI row (keep existing `testId`s `stat-wallet`, `stat-in-transit`, `stat-ndr`, `stat-delivered` and labels); Needs you today; Smart insights panel (right column on desktop, after KPIs on phones); delivery-success `Gauge` (delivered / (delivered + rto)); wallet `FillMeter`; quick actions; recent shipments; onboarding checklist. Keep every existing heading text and link.
- [ ] **Step 2:** Each data group is its own async server component inside `<Suspense fallback={<Skeleton …/>}>`, so the page no longer waits on one `Promise.all`. Cards use `motion-stagger`.
- [ ] **Step 3:** `pnpm typecheck && pnpm lint` → exit 0.
- [ ] **Step 4:** Commit `feat(home): bento home with smart insights and needs-you-today`.

### Task 10: Dashboard redesign, parallel paging, sign-off screenshots

**Files:**
- Modify: `src/app/(app)/dashboard/{page.tsx,tabs/*.tsx}`, `src/lib/data/rto/courier.ts`, `src/app/(app)/dashboard/loading.tsx`, `Readme.md`, `updatesDoc.md`

- [ ] **Step 1:** Restyle every tab with the new cards and charts (same tabs, data, `testId`s and headings). Tabs as a segmented control with a sliding indicator; on phones it scrolls with fade edges as a scroll hint.
- [ ] **Step 2:** The tab content renders inside `<Suspense>`; the page no longer awaits the wallet first.
- [ ] **Step 3:** `pickups-tab.tsx` and `rto/courier.ts`: fetch page 1, then pages 2..min(pageCount, cap) with `Promise.all`; caps (`MAX_PAGES = 20`, `MAX_PAGES_PER_STAGE = 20`) and the "Based on N of M" caption logic unchanged.
- [ ] **Step 4:** `pnpm typecheck && pnpm lint && pnpm build` → exit 0. Screenshots: `node scripts/screenshots.mjs /home /dashboard /dashboard?tab=ndr` and the same with `--dark`. Look at desktop, phone and 320px: no sideways scroll, tab bar not covering content, contrast readable.
- [ ] **Step 5:** Update `Readme.md` (Home, insights, ⌘K, theme switch) and `updatesDoc.md`. Commit `feat(dashboard): redesigned dashboard tabs with streaming and parallel paging`.
- [ ] **Step 6: STOP.** Show the user the Home and Dashboard screenshots (desktop + phone, light + dark) and wait for sign-off before Phase 3.

## Phase 3: Module passes

Each task: apply `tableStyles`, `StatTile`, charts, `glass` and motion to the module's screens; phone cards where tables exist; add the listed `loading.tsx` files; keep testIds, headings, labels and field names; end with `grep` for any changed visible strings in `e2e/` and `src/**/*.test.ts` (update assertions), `pnpm typecheck && pnpm lint`, screenshots of the module's routes (light and dark, after `pnpm build`), and a commit `feat(<module>): Evoc Ships redesign`.

### Task 11: Shipments

**Files:** `src/app/(app)/orders/**` (list, `[id]`, create, bulk, b2b, b2c), `src/components/orders/*`, `src/lib/data/orders/gateway.ts`, `src/lib/gateway/schemas/orders.ts`, `src/lib/data/shipments/summary.ts`, `src/lib/gateway/schemas/shipments.ts`. Create `loading.tsx` for `/orders`, `/orders/[id]`, `/orders/create`.

**Interfaces:**
- Produces: `normaliseOrdersPage(raw: unknown): OrdersPage` in `src/lib/gateway/schemas/orders.ts`, accepting the gateway demo shape `{ items, page, limit, total }` and order-engine's `{ shipments, pagination: { page, limit, total, total_pages } }` (`id` → `shipment_id`, missing `last_status_at` → `updated_at`, missing `stuck` → `false`, null `awb` → `null`, shown as "Not assigned").

- [ ] **Step 1:** Redesign the screens. Phone order cards get swipe-left actions (Track → `/tools/tracking?awb=…`, Copy AWB) via pointer events; the same two actions stay as visible buttons on the card.
- [ ] **Step 2:** Search page count: when `search` is set on gateway data, show "{n} matches on this page" and keep Next/Previous by gateway page instead of a total-based page count.
- [ ] **Step 3:** Use `normaliseOrdersPage` in `orders/gateway.ts`; `toShipmentSummary` adds `CREATE_REQUESTED` (default 0) to `toBeProcessed`.
- [ ] **Step 4:** Checks and commit (per Phase 3 rule).

### Task 12: NDR, RTO, Pickups

**Files:** `src/app/(app)/ndr/**`, `src/app/(app)/rto/**`, `src/app/(app)/orders/pickups/**` (manifest print stays print-friendly: light only, no shell chrome). Create `loading.tsx` for `/ndr` and `/orders/pickups/manifest-print/[id]`.

- [ ] **Step 1:** Redesign; checks and commit.

### Task 13: Finances and Reconciliation

**Files:** `src/app/(app)/finances/**` (wallet, COD, invoices, invoice `[id]`, recharge), `src/app/(app)/reconciliation/**`. Create `loading.tsx` for `/finances/invoices/[id]`. Invoice detail keeps a light print style.

- [ ] **Step 1:** Redesign (wallet page uses `FillMeter` and `SegmentBar` for spend split where data exists); checks and commit.

### Task 14: Reports, Tools, Channel integrations

**Files:** `src/app/(app)/reports/**`, `src/app/(app)/tools/**`, `src/app/(app)/channel-integrations/**`.

- [ ] **Step 1:** Redesign; checks and commit.

### Task 15: Settings

**Files:** `src/app/(app)/settings/**` (all sections). Toggles use the Task 4 switch with a visible off state.

- [ ] **Step 1:** Redesign; checks and commit.

### Task 16: Support and help centre

**Files:** `src/app/(app)/support/**`, `src/content/help/articles.ts` (read only). Create `loading.tsx` for `/support/tickets`, `/support/tickets/[id]`, `/support/help`, `/support/help/[slug]`.

- [ ] **Step 1:** Help centre: the page filters on the server from `q` and passes only `{ slug, title, summary, category }` to `HelpBrowser`; article bodies load only on `/support/help/[slug]`. Search behaviour and URLs unchanged.
- [ ] **Step 2:** Redesign; checks and commit.

### Task 17: Public and auth screens

**Files:** `src/app/(auth)/**` (login, signup, forgot-password, terms, layout), `src/app/(public)/**` (layout, track, not-found), `src/app/not-found.tsx`, `src/app/global-error.tsx`, `src/app/(app)/error.tsx`. Create `loading.tsx` for `/track/[awb]`.

- [ ] **Step 1:** Auth: keep the split layout, every field, tab and behaviour; brand panel in Midnight Glass in both themes with `BrandMark onDark` and "Multiple logistics partners. One unified dashboard."; form side follows the theme; `ThemeToggle variant="icon"` in the corner. Public tracking: Evoc Ships header, system theme only, no toggle.
- [ ] **Step 2:** Checks; update `Readme.md` screen table and `updatesDoc.md` for Phase 3; commit.

## Phase 4: Wrap-up

### Task 18: Backend gaps doc, docs, final check

**Files:** Create `docs/backend-connection-gaps.md`; modify `Readme.md`, `updatesDoc.md`.

- [ ] **Step 1:** `docs/backend-connection-gaps.md`: the backend gap list given to the user on 2026-11-14 (in the conversation and summarised in the spec), with the "passing the signed-in token" line replaced by the spec's credentials note, and the list-shape item noting the frontend now accepts both shapes.
- [ ] **Step 2:** `pnpm typecheck && pnpm lint && pnpm build` → exit 0. `node scripts/screenshots.mjs` and `node scripts/screenshots.mjs --dark` (every route); look through them for sideways scroll, covered content, contrast and broken layouts; fix what's found.
- [ ] **Step 3:** `git -C ../Evoc_ships status --porcelain` → empty; HEAD `aace603`.
- [ ] **Step 4:** Final `Readme.md` and `updatesDoc.md` (summary, every assertion edited without running, "test suites not run per user; the team will test", follow-ups: `cacheComponents`/PPR, React Compiler, merchant branding on the public tracking page, chat assistant when the backend adds AI). Commit `chore: Evoc Ships redesign handover`.
