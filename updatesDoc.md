# Updates

A running record of what has been done on the Evoc Logistics frontend. Newest entries come first.

## Current status

| | |
|---|---|
| **Current stage** | Stage 2: main dashboard, built and awaiting review |
| **Waiting on** | Review and sign-off of the dashboard |
| **Next step** | The next UI you direct, with its reference image and design file |
| **Also needed** | Final product name and logo; real left-panel copy; terms text; Docker Desktop to test against the real gateway |

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
