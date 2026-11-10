import { expect, test, type Locator, type Page } from '@playwright/test';

/** The sizes every screen must fit without sideways page scroll. */
export const SIZES = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const;

export type Size = { width: number; height: number };

/** Resizes to each size in turn and expects the page to be no wider than the window. */
export async function expectNoSidewaysScroll(page: Page, sizes: readonly Size[] = SIZES) {
  const original = page.viewportSize();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        { message: `sideways scroll at ${size.width}x${size.height}` },
      )
      .toBeLessThanOrEqual(0);
  }
  if (original) await page.setViewportSize(original);
}

/** Expects each target to be visible and at least 44px tall, the smallest comfortable tap. */
export async function expectTapTargets(page: Page, locators: readonly Locator[]) {
  for (const target of locators) {
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    expect(box?.height ?? 0, `${target} is shorter than 44px`).toBeGreaterThanOrEqual(44);
  }
}

/** Opens `route` in a fresh, signed-out browser context and expects to land on the login page. */
export async function expectSignedOutRedirect(page: Page, route: string) {
  const browser = page.context().browser();
  if (!browser) throw new Error('expectSignedOutRedirect needs a browser-launched page');
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    const fresh = await context.newPage();
    await fresh.goto(route);
    await expect(fresh).toHaveURL(/\/login(\?|$)/);
  } finally {
    await context.close();
  }
}
