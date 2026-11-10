# Task 15 report: Rate card

Status: DONE. Commit 657a195 "feat(rate-card): Rate card screen and backend connection".

## Implemented
- `src/lib/data/rates/` (types, mock, gateway, index, rates.test.ts). `RatesService` has `getRateCard()` only (ruling R6). Gateway returns `notAvailable()`. `DATA_SOURCE_RATES` on port 3106 and in `.env.example`.
- Sample has one row per `CARRIERS` entry and zone A-E. Seed values copied for A-D and four carriers; zone E and Blue Dart invented.
- Page `/tools/rate-card`: carrier filter (`?carrier=`, parseEnum), desktop table, phone cards per carrier, zone legend. `formatPaise`, COD fee as percent plus minimum.
- Nav Rate Card live; route in `e2e/routes.ts`.

## TDD
- RED unit: mock with a zone dropped failed with "length 25 but got 20" (the unit test was written alongside the code, then checked by breaking the mock).
- RED browser: `pnpm build && playwright test e2e/rate-card.spec.ts --project=desktop --project=phone`: 19 failed, 3 skipped (page did not exist).
- GREEN: 19 passed, 3 skipped.

## Part D
| Check | Result |
|---|---|
| D1 | lint and typecheck clean, 45 files / 434 tests passed |
| D2 | 725 passed, 45 skipped, 0 failed (includes gateway project) |
| D3 | `/tools/rate-card` 200 with h1, BROWSER ERRORS: none |
| D4 | screenshots in test-results/screenshots/tools-rate-card-{desktop,phone,small}.png reviewed, fine |
| D5, D6 | no output |
| D7 | backend clean, aace603 |
UTF-8 check: 0.

## Files
New: src/lib/data/rates/*, src/app/(app)/tools/rate-card/{page,loading,rate-table,rate-filter}.tsx, e2e/rate-card.spec.ts.
Changed: nav-config.ts, e2e/routes.ts, e2e/gateway.spec.ts, playwright.config.ts, .env.example, Readme.md, updatesDoc.md. Nothing outside the list.

## Concerns
- "wraps long values" has no long text to use; it checks 320px with the widest figures.
- Empty state not covered in a browser (sample always has rows).
- Rate table lives in `rate-table.tsx` as a server component; the filter is the only client part.

## Fix round 1
Finding: zone legend descriptions stated routing rules that the backend does not define.
Changed `src/lib/data/rates/types.ts` descriptions to match `order-engine/src/allocation/zone.ts` `resolveZone` (read only): A same three-digit pincode prefix (city or district area), B same state circle, C different states with both pincodes in the metro list, D anything else. No city names listed. E now reads "A sample zone for remote areas. The courier network doesn't define it yet." Short names unchanged.
Test: new case "describes zones the way the backend decides them" in `src/lib/data/rates/rates.test.ts`, one assertion per zone.
- RED: `pnpm exec vitest run src/lib/data/rates` -> 1 failed | 5 passed (A description assertion failed on old wording).
- GREEN: same command -> 6 passed.
- `pnpm lint` clean; `pnpm typecheck` clean.
- `pnpm build && pnpm exec playwright test e2e/rate-card.spec.ts --project=desktop --project=phone` -> 19 passed, 3 skipped.
- UTF-8 check: 0.
Nothing left running.
