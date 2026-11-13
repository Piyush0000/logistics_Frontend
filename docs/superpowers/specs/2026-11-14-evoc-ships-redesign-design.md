# Evoc Ships redesign: design

Date: 2026-11-14. Status: awaiting the user's approval.

## Why

The first build copied the Sharkship look and data layout so the frontend could talk to the backend quickly. The user now wants Evoc Ships to look like its own product, clearly different from and better than the competition (Sharkship, Shiprocket and similar shipping panels), on desktop and phone. The landing page (https://evoc-ships-web.vercel.app/) sells "many logistics partners, one unified dashboard" in short, plain, confident copy. The app should feel like that promise.

## Goals

- A new visual identity built from the Evoc Ships logo, applied to all 41 screens and 47 route variants.
- Two looks of one design: **light = "Bento Light"** (direction D) and **dark = "Midnight Glass"** (direction E), as picked in the visual preview on 2026-11-14.
- Animations and micro-interactions that explain change and make the app feel fast.
- New features: Smart insights, a "Needs you today" list, a ⌘K command search, phone bottom tab bar, slide-up sheets on phones, swipe actions on shipment cards.
- Faster pages: persistent menu, streaming content, smaller browser downloads.
- Frontend-side fixes to the backend connection.
- Phone and desktop both first-class.

## Non-goals

- Backend changes. `D:\EvocLogistics\Evoc_ships` stays at `aace603` with a clean tree. Backend gaps are documented for the backend team instead.
- A chat assistant. The backend has no AI service; chat comes later.
- New screens beyond those listed above, and new data that no data service provides.
- Renaming routes or removing any existing screen or behaviour.

## Anti-goals (failure even if it "works")

- Anything that still reads as Sharkship or as a copy of any reference image (names, figures, logos, layouts copied one-to-one).
- Motion that slows tasks down, loops for no reason, or ignores "reduce motion".
- Dark mode with unreadable contrast, or light mode that loses the brand.
- A working flow that breaks: booking, filters, exports, settings saves, sign-in.
- Sample data presented as real. "Sample data" badges stay wherever they are today.

## Constraints

- Work only in `D:\EvocLogistics\logistics_Frontend`, on a new branch `feature/redesign` created from `feature/full-frontend` (`b925984`). Commit locally; never push. Never commit `.superpowers/`.
- **Speed rule from the user:** do not run unit or browser test suites unless truly necessary; the team will test. Allowed and expected: `pnpm typecheck`, `pnpm lint` and `pnpm build` at the end of each phase, plus screenshots to see how data looks.
- **"Do not break anything" without running tests means:** keep routes, form field names, server actions, accessible names, roles, headings and `data-testid`s stable. When visible text that a test asserts must change (for example the brand name), update those assertions in `e2e/` and `src/**/*.test.ts` in the same commit, found by search, without running them. Record every such edit in `updatesDoc.md`.
- Keep `Readme.md` and `updatesDoc.md` current every phase.
- Stack stays: Next.js 16.4.5, React 19, Tailwind 4, TypeScript. No new runtime dependencies unless listed here.

## Approaches considered

1. **Restyle the shared building blocks, then polish each module** (picked by the user). Theme tokens, shell, cards, tables, forms, dialogs and charts change once and all screens inherit; each module then gets a polish pass. Existing tests keep guarding behaviour; least risk.
2. **Redesign every screen from scratch.** Most freedom, but rewrites working screens and their tests; slowest and riskiest.
3. **Build a second app beside the current one and move screens over.** Easy to switch back, but two designs live side by side for weeks.

## Brand

- Name: **Evoc Ships** (replaces "Evoc Logistics" everywhere: page titles, metadata, brand mark, copy; 46 occurrences in `src` and `e2e` today).
- Logo: the supplied image is committed at `public/brand/evoc-ships-logo.png` (2400×418, transparent). A hand-traced inline SVG in `src/components/brand-mark.tsx` (replacing the placeholder truck) is acceptable and preferred. Measured geometry in image pixels: block x 24–327, y 24–303, top corners rounded (radius ≈ 35), bottom band y 234–303 (the lower 25%); two bars x 375–479, at y 106–140 and y 188–221; wordmark "Evoc Ships" x 622–2242, cap height from y 53. Colours: block `#183EEB`, band `#112CAB`, bars `#183EEB`, wordmark `#17243A` in light and `#E6EBF7` in dark. The wordmark may be set as text in the UI font (Plus Jakarta Sans, 700) instead of traced outlines. A compact mark (block + bars only) for the collapsed menu, the favicon (`src/app/icon.svg`) and the loader.
- The "=" bars are the brand motif: the loading indicator, section markers.

## Visual reference

- The two looks were picked from the live preview, saved at `docs/superpowers/specs/assets/2026-11-14-directions-v2.html` (open in a browser). **D · Bento Light** is the first mockup in that file and **E · Midnight Glass** the second; the third (F) was not picked. The bento grid, two-tone numbers, coloured category dots, gauge, wallet fill meter, assistant-panel position (now Smart insights), grouped menu and glass cards come from there. Follow the mood, layout and component styles; the exact pixel values in the preview are sketches, and the token tables in this document win where they differ.
- `2026-11-14-directions-v1.html` holds the first round (A–C, not picked) and the shared motion demo at its bottom, which this document's Motion section formalises.
- "Reference images" in the anti-goals means the four inspiration dashboards the user shared on 2026-11-14 (other companies' products) and the Sharkship / Mera Courier Wala design files: take ideas, never their names, figures, logos or one-to-one layouts.

## Colour tokens

All 43 page files and every component already use named Tailwind tokens (only one hard-coded colour exists, `themeColor` in `src/app/layout.tsx`), so the redesign swaps token values instead of editing classes. Token names stay the same to avoid touching ~1,300 class uses; values become CSS variables that change with the theme.

| Token (existing name) | Role | Light (D) | Dark (E) |
|---|---|---|---|
| `tertiary` | page background | `#EEF0F5` | `#070B16` (plus two soft blue radial glows) |
| `surface`, `neutral` | cards, inputs | `#FFFFFF` | `#0F1629` solid; glass on desktop (below) |
| `secondary` | borders, dividers | `#E3E7EF` | `#1F2942` |
| `on-surface` | text (use `/70`, `/60` for muted as today) | `#17243A` | `#E6EBF7` |
| `primary` | brand, links, main buttons | `#183EEB` | `#4C6BFF` (brighter for contrast on dark) |
| `muted` | soft brand tint (chips, active menu) | `#EEF1FD` | `#4C6BFF29` |
| `accent` | secondary brand fill | `#112CAB` | `#183EEB` |
| `success` | | `#16A34A` | `#4ADE80` |
| `warning` | | `#D97706` | `#FBBF24` |
| `error` | | `#DC2626` | `#F87171` |
| **new** `on-primary` | text and icons on `primary`/`accent` fills | `#FFFFFF` | `#FFFFFF` |

- `text-tertiary` is used 49 times, mostly as light text on blue fills. In dark mode `tertiary` becomes near-black, so every `text-tertiary` (and `border-tertiary`) on a coloured fill switches to `on-primary`. The builder audits all 49.
- Contrast: body text and status text must meet WCAG AA (4.5:1) on their background in both themes; the values above were chosen for that, and the builder checks any tint combination it introduces.
- Dark-mode glass: at `min-width: 48rem`, cards use a translucent gradient (`rgba(255,255,255,.07)` to `.02`), a `rgba(255,255,255,.09)` border and `backdrop-filter: blur(10px)`. Phones get the solid `surface` colour (blur is slow on low-end phones).
- `themeColor` follows the theme (light `#EEF0F5`, dark `#070B16`).

## Theme switching

- `data-theme="light" | "dark"` on `<html>`. Choice is Light, Dark or System (default System, following `prefers-color-scheme`).
- Stored in `localStorage` (`evoc-theme`) and applied before first paint by a tiny inline script in the root layout, with `suppressHydrationWarning` on `<html>`. No cookie read on the server, so static pages (`/terms`) stay static.
- The switch lives in the user menu in the top bar, and on the auth pages as a small icon button.

## Typography and shape

- Fonts: **Plus Jakarta Sans** (400–800) for all text and headings; **Geist Mono** (400, 500) for numbers in KPI tiles, AWBs, amounts in tables and IDs. Both via `next/font/google`. Manrope, Inter and IBM Plex Sans are removed (fewer files on every page).
- Two-tone big numbers on KPI tiles (the leading digits in full colour, the rest at 40%), as in direction D.
- Radius: controls 10px, cards 16px, chips and pills fully round. Control height stays 44px on touch and 36px on desktop with a fine pointer (currently 32px; 36px reads better with the new type).
- Light shadows: none at rest, a soft lift on hover (`0 8px 22px rgba(23,36,58,.12)`). Dark: no shadows; borders and glass do the work.
- The `theme-auth` / `theme-app` split ends: one token set for every screen.

## Shell (menu and top bar)

- Moves from each page into `src/app/(app)/layout.tsx` so it renders once and stays mounted between pages (also a speed fix, see Performance). Pages render only their content.
- **Sidebar (desktop):** white (light) or glass (dark) panel with the brand mark, menu items grouped under small section headings in the order of today's `NAV` (labels and links unchanged), keyboard-shortcut hints for Search (⌘K) and Create shipment, active item in `muted` with `primary` text (light) or a blue glow bar (dark). Keeps the existing collapse to icons.
- **Top bar:** page title area, the ⌘K search field (it still does the comma-separated AWB search it does today, and also opens the command search), wallet chip (balance + refresh), user menu (email, theme switch, sign out).
- **Breakpoints:** phone navigation (bottom tab bar, sheets instead of dialogs, slide-in menu) below 64rem, matching today's shell switch at `lg`; dark-mode glass from 48rem. Tablets (48–64rem) therefore get glass cards with phone navigation.
- **Phone:** the top bar shrinks to brand mark, search icon, wallet and avatar. A **bottom tab bar** gives Home, Shipments (`/orders`), Create (`/orders/create`, centre button), Wallet (`/finances/wallet`) and More (opens the existing slide-in menu with every item). Safe-area padding at the bottom.

## Building blocks

All live in `src/components/ui` and `src/components/charts`; screens keep using them.

- **Cards** (`DataCard`, `StatTile`): 16px radius, bento spacing (12px gap on phones, 16px on desktop), header with title, optional caption, optional action icon button. `StatTile` gets a coloured category dot, two-tone number, change chip ("↗ 9% vs last month") and optional sparkline.
- **Tables:** sticky header, roomier rows, hover tint, numbers right-aligned in Geist Mono, status chips (filled tint in light, outlined in dark). Screens that already switch to cards on phones keep doing so with the new card style.
- **Forms:** new field style (10px radius, clear focus ring in `primary`, error text under the field as today), toggles with a visible off state, segmented controls for tabs.
- **Dialogs:** centred on desktop; on phones they become **bottom sheets** that slide up, with a drag handle and the same focus handling `dialog.tsx` has today.
- **Feedback:** buttons show pressed → working (the "=" loader) → done or failed. Empty states get a small illustration built from the logo shapes. Skeletons match each card's real shape.
- **Charts:** restyle `bar-chart.tsx` (rounded bars, light/dark colours, grow-from-baseline animation) and add server-rendered SVG components: `Gauge` (half ring), `Sparkline`, `LineChart`, `SegmentBar` (stacked percentage bar) and `FillMeter` (the wallet "tank"). Every chart keeps an accessible text/table equivalent like the current bar chart. The builder loads the `dataviz` skill before writing chart code.

## Motion and micro-interactions

CSS only (no animation library), shared tokens in `globals.css`:

- Durations: 150ms presses and hovers, 250ms panels, sheets and dialogs, up to 700ms chart entrances. One easing, `cubic-bezier(.2,.8,.2,1)`.
- Arrival: cards fade up in a short stagger (40–60ms apart); bars grow from the baseline; gauges and sparklines draw in; list rows slide in.
- Live indicators: a pulsing dot only where data is fresh, never decorative loops elsewhere. The dark-mode background glow may drift very slowly.
- KPI numbers count up to their value on first view (one small client component; skipped with reduce motion).
- Status chips cross-fade when they change; copy buttons confirm with a check; saves confirm inline.
- Phone: sheets slide up, bottom tabs show a moving indicator, swipe a shipment card left to reveal Track and Copy AWB (the same actions remain available as visible buttons, so swiping is never required).
- `prefers-reduced-motion: reduce` keeps instant changes, as the current global rule already does.

## Screens

- **Home (`/home`):** bento layout: greeting, KPI row (Orders, Delivered, RTO, COD due), **Needs you today** (actionable counts: NDRs awaiting action, weight disputes, pickups due, KYC or onboarding steps left, each linking to its screen), **Smart insights** panel, shipments chart, delivery-success gauge, wallet fill meter, top partners list. Existing onboarding/KYC content stays, restyled.
- **Dashboard (`/dashboard` and its tabs):** same tabs and data, rebuilt with the new cards and charts.
- **Every other module** gets the shared blocks automatically, then a polish pass in this order: Shipments (list, create, bulk, details, B2B, B2C), NDR, RTO, Pickups, Finances (wallet, COD, invoices, recharge), Reconciliation (weight, weight settings), Reports, Tools (rate card, calculator), Settings (all sections), Support (tickets, help centre), Channel integrations, then public and auth screens (login, sign-up, forgot password, tracking page, terms, not-found, error).
- **Public tracking page (`/track/[awb]`):** keeps the Evoc Ships brand header as today (no merchant branding yet; showing the merchant's tracking-page settings to buyers is a follow-up). It follows the system theme only, with no switch, since buyers have no user menu.
- **Login and sign-up:** keep the split layout and every field and behaviour. The brand panel uses the Midnight Glass look in both themes (navy, blue glow, logo, landing-page message "Multiple logistics partners. One unified dashboard."); the form side follows the theme.

## Smart insights

- A server module `src/lib/insights/` with pure functions that take results the existing data services already return (shipment stats, NDR list, weight disputes, COD/remittance, wallet, pickups, RTO) and return a ranked list of `Insight { id, tone: 'action' | 'warning' | 'good' | 'info', title, detail, href, isSample }`.
- Starting rules (thresholds are the builder's call): open NDRs need a response; weight disputes close soon; wallet below the next day's typical spend; a carrier's RTO share is well above the others; COD payout due date; pickups scheduled today; stuck shipments count.
- An insight built from sample data shows the existing "Sample data" badge. Rules whose data source is unavailable are skipped silently.
- Shown on Home (panel) and as the source of "Needs you today". No chat box.
- Unit tests for the rule functions are written (cheap, pure functions) but the suite is not run unless the builder needs it.

## Command search (⌘K)

- Client component opened by ⌘K / Ctrl+K, the top-bar search field, or the phone search icon. A dialog (sheet on phones) with: jump to any screen (built from `NAV`), quick actions (Create shipment, Bulk upload, Recharge wallet, New ticket, Track a shipment), and AWB lookup (typing something AWB-like offers "Track AWB …", using the existing tracking search).
- Keyboard: arrows, Enter, Escape; fully labelled for screen readers.

## Performance

From the audit of 2026-11-14 (findings ranked by impact):

1. Move `AppShell` into `(app)/layout.tsx`; wrap `getDemoSession` in React `cache()` so it runs once per request. The wallet chip fetches its own balance inside a `Suspense` boundary, so a slow wallet never blocks the page.
2. Wrap independent card groups on Home, Dashboard and other multi-source pages in their own `Suspense` with shape-matched skeletons, so each streams in on its own instead of waiting for `Promise.all`.
3. Add `(app)/loading.tsx` (content-area skeleton; the shell stays visible) and per-route `loading.tsx` for `/orders`, `/orders/[id]`, `/orders/create`, `/ndr`, `/support/tickets`, `/support/tickets/[id]`, `/support/help`, `/support/help/[slug]`, `/finances/invoices/[id]`, `/track/[awb]`.
4. Wallet "refresh" calls a small server action returning only the balance, not `router.refresh()`. `orders/create/create-form.tsx` drops `window.location.reload()` for a state reset.
5. Client components import from `<feature>/types` or `<feature>/input`, never `<feature>/index`; move `LAST_ADMIN_MESSAGE` to `team/types.ts`; add `import 'server-only'` to each feature `index.ts`, `gateway.ts` and `mock.ts` (17 client files listed in the audit).
6. `CARRIERS` reaches client components as a prop from the server page instead of importing `@logicore/contracts` in the browser (pulls ~79 KB of schemas and zod).
7. Pickups tab and RTO aggregation fetch page 1, then the remaining pages in parallel (capped as today) instead of one after another.
8. Help centre: send article titles and summaries to the browser, not full bodies; search on the server via `q`.
9. Two font families instead of three (above).

Deliberately not done now (risk without running tests): `cacheComponents`/PPR and the React Compiler. Recorded as follow-ups.

## Backend connection: frontend-side fixes

1. **Credentials (no code change; builder's-check call):** the two cookies are kept apart on purpose. `evoc_demo_session` holds only the demo email and must never be sent to the gateway; `evoc_session` is reserved for the token a real login will issue, and `credentials.ts` already reads it first (with separate `shipments` and `webhooks` tokens). The real gap is that no login exists in the backend. So: no cookie merge; document this in `docs/backend-connection-gaps.md` and in the Readme ("production sends no gateway credential until the backend issues one"). `session.test.ts` and `e2e/login.spec.ts` stay as they are.
2. **Search page count:** when a search is active on All Shipments, show "N matches on this page" and page through the gateway's pages, instead of a total that ignores the search.
3. **List response shape:** accept both the gateway's demo shape (`items`, `page`, `limit`, `total`) and order-engine's shape (`shipments`, `pagination`) and normalise to one internal type, so live mode works whichever the backend team settles on. Missing `last_status_at` falls back to `updated_at`; missing `stuck` is `false`; null AWB shows "Not assigned".
4. **Stats:** count `CREATE_REQUESTED` under "To be processed"; missing `stuck` stays 0 (as today).
5. Add `docs/backend-connection-gaps.md`: the backend gap list sent to the user on 2026-11-14, plus the credentials note in item 1, committed so the team can reference it.

## Phases and sign-off

1. **Foundation:** branch, tokens (light/dark), fonts, theme switch, brand mark and name, shell moved to the layout with the new sidebar, top bar and phone tab bar, performance items 1, 3, 4, 5, 6, 9.
2. **Home and Dashboard:** new charts, Smart insights, Needs you today, ⌘K, Suspense streaming (item 2), item 7. **Stop for the user's sign-off** with screenshots of Home and Dashboard at desktop and phone, light and dark.
3. **Module passes** in the order listed under Screens, plus items 8 and backend fixes 2–4. No stop between modules unless something needs the user.
4. **Wrap-up:** `docs/backend-connection-gaps.md`, Readme and updatesDoc, final `typecheck`/`lint`/`build`, screenshots of every route in both themes at desktop and phone.

## Verification

- Each phase ends with `pnpm typecheck`, `pnpm lint` and `pnpm build` passing.
- Screenshots (existing screenshots script, mock data) of every screen touched, at desktop and phone, light and dark, looked at for overflow, contrast and layout.
- Unit and browser suites are not run (user's rule). `updatesDoc.md` says so plainly and lists every test assertion edited without being run.
- `git -C ../Evoc_ships status --porcelain` stays empty at `aace603`.

## Left to the builder

Component APIs and file layout inside `src/components`, chart internals, skeleton shapes, insight thresholds and wording, the exact section headings in the sidebar, empty-state illustrations, and the order of polish within a module.
