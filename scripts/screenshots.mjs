// Saves desktop, phone and 320px screenshots of routes, served from the production build.
// Run `pnpm build` first.
//
// Usage: node scripts/screenshots.mjs [--menu] [route ...]
//   In Git Bash, prefix MSYS_NO_PATHCONV=1 so '/dashboard' is not turned into a Windows path.
//   With no routes, it takes every route in e2e/routes.ts.
//   --menu also saves each size with the sidebar open, as <slug>-<size>-menu.png.
// Output: test-results/screenshots/<slug>-{desktop,phone,small}.png
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const PORT = 3102;
const BASE = `http://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const OUT = join(ROOT, 'test-results', 'screenshots');

const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: devices['Pixel 7'],
  small: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
};

// The routes file without its comments, so only real route strings are read.
const ROUTES_TEXT = readFileSync(join(ROOT, 'e2e', 'routes.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
const quoted = (text) => [...text.matchAll(/'(\/[^'\s]*)'/g)].map((match) => match[1]);
const PUBLIC = new Set(quoted(ROUTES_TEXT.match(/PUBLIC_ROUTES[^;]*/)?.[0] ?? ''));

const slug = (route) =>
  route.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9-]+/g, '-') || 'root';

let server = null;

function stopServer() {
  if (!server || server.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
}

function fail(message) {
  console.error(message);
  stopServer();
  process.exit(1);
}

process.on('exit', stopServer);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopServer();
    process.exit(1);
  });
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function startServer() {
  if (!existsSync(join(ROOT, '.next', 'BUILD_ID'))) fail('No build found. Run `pnpm build` first.');
  if (await portInUse(PORT)) {
    fail(`Port ${PORT} is already in use. Stop whatever is listening there and run this again.`);
  }
  let log = '';
  server = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  server.stdout.on('data', (chunk) => (log += chunk));
  server.stderr.on('data', (chunk) => (log += chunk));

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) fail(`next start exited before it was ready:\n${log}`);
    try {
      if ((await fetch(`${BASE}/login`)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  fail(`next start did not answer on port ${PORT} within a minute:\n${log}`);
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Email + Password' }).click();
  await page.getByLabel('Work email').fill('ops@example.com');
  await page.getByRole('checkbox').check();
  await page.locator('input[name="password"]').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
}

async function openMenu(page) {
  const button = page.getByRole('button', { name: /^(Open menu|Expand sidebar)$/ }).first();
  if (await button.isVisible()) {
    await button.click();
    // The sidebar slides or widens over 200ms.
    await page.waitForTimeout(400);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const withMenu = args.includes('--menu');
  const given = args.filter((arg) => !arg.startsWith('--'));
  const routes = given.length > 0 ? given : [...new Set(quoted(ROUTES_TEXT))];
  for (const route of routes) {
    if (/^[A-Za-z]:[\/]/.test(route)) {
      fail(
        `Git Bash turned ${route} into a Windows path. Run with MSYS_NO_PATHCONV=1, for example:
` +
          '  MSYS_NO_PATHCONV=1 node scripts/screenshots.mjs /dashboard',
      );
    }
    if (!route.startsWith('/')) fail(`Routes start with '/': ${route}`);
  }

  mkdirSync(OUT, { recursive: true });
  await startServer();
  const browser = await chromium.launch();
  const saved = [];
  try {
    for (const [size, options] of Object.entries(SIZES)) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      // Public pages first, while signed out, then the signed-in pages.
      const ordered = [
        ...routes.filter((route) => PUBLIC.has(route)),
        ...routes.filter((route) => !PUBLIC.has(route)),
      ];
      let signedIn = false;

      for (const route of ordered) {
        if (!PUBLIC.has(route) && !signedIn) {
          await signIn(page);
          signedIn = true;
        }
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
        const file = join(OUT, `${slug(route)}-${size}.png`);
        await page.screenshot({ path: file, fullPage: true });
        saved.push(file);
        if (withMenu && !PUBLIC.has(route)) {
          await openMenu(page);
          const menuFile = join(OUT, `${slug(route)}-${size}-menu.png`);
          await page.screenshot({ path: menuFile });
          saved.push(menuFile);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    stopServer();
  }
  console.log(saved.join('\n'));
}

main().catch((error) => fail(error instanceof Error ? error.stack : String(error)));
