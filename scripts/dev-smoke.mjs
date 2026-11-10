// Opens every route in e2e/routes.ts under `next dev` and fails on any browser error.
// It catches problems that only show in development, such as React mounting components twice.
//
// Usage: node scripts/dev-smoke.mjs
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = 3107;
const BASE = `http://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

// The routes file without its comments, so only real route strings are read.
const ROUTES_TEXT = readFileSync(join(ROOT, 'e2e', 'routes.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

/** Routes, read as text: every single-quoted string starting with '/'. */
function readRoutes() {
  const text = ROUTES_TEXT;
  const routes = [...text.matchAll(/'(\/[^'\s]*)'/g)].map((match) => match[1]);
  return [...new Set(routes)];
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

let server = null;
let serverLog = '';

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

async function startServer() {
  if (await portInUse(PORT)) {
    fail(`Port ${PORT} is already in use. Stop whatever is listening there and run this again.`);
  }

  server = spawn(process.execPath, [NEXT_BIN, 'dev', '-p', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  server.stdout.on('data', (chunk) => (serverLog += chunk));
  server.stderr.on('data', (chunk) => (serverLog += chunk));

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      if (/already running/i.test(serverLog)) {
        fail(
          'Another `next dev` is already running in this folder, and Next.js allows only one.\n' +
            'Stop it (for example the `pnpm dev` on port 3100) and run this again.\n' +
            'This script did not stop it, because it did not start it.',
        );
      }
      fail(`next dev exited before it was ready:\n${serverLog}`);
    }
    try {
      const response = await fetch(`${BASE}/login`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(`next dev did not answer on port ${PORT} within 2 minutes:\n${serverLog}`);
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.getByRole('tab', { name: 'Email + Password' }).click();
  await page.getByLabel('Work email').fill('ops@example.com');
  await page.getByRole('checkbox').check();
  await page.locator('input[name="password"]').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 120_000 });
}

async function visit(page, route, errors) {
  const before = errors.length;
  const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 120_000 });
  const status = response?.status() ?? 0;
  const h1 = page.locator('h1').first();
  let heading = '(none)';
  try {
    await h1.waitFor({ state: 'visible', timeout: 30_000 });
    heading = (await h1.innerText()).replace(/\s+/g, ' ').trim();
  } catch {
    errors.push(`${route}: no visible h1`);
  }
  // Gives React time to hydrate and report errors such as double mounting.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  if (status !== 200) errors.push(`${route}: HTTP ${status}`);
  console.log(`${route}: HTTP ${status} | h1: ${heading}`);
  for (const error of errors.slice(before)) console.log(`  ! ${error}`);
}

async function main() {
  if (!existsSync(NEXT_BIN)) fail('Next.js is not installed. Run `pnpm install` first.');
  const routes = readRoutes();
  if (routes.length === 0) fail('No routes found in e2e/routes.ts.');

  const publicRoutes = new Set(
    [...(ROUTES_TEXT.match(/PUBLIC_ROUTES[^;]*/)?.[0] ?? '').matchAll(/'(\/[^'\s]*)'/g)].map(
      (match) => match[1],
    ),
  );

  await startServer();
  console.log(`next dev ready on port ${PORT}. Checking ${routes.length} routes.\n`);

  const browser = await chromium.launch();
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    let current = '';
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${current}: console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${current}: page error: ${error.message}`));

    for (const route of routes.filter((route) => publicRoutes.has(route))) {
      current = route;
      await visit(page, route, errors);
    }

    current = 'sign in';
    await signIn(page);

    for (const route of routes.filter((route) => !publicRoutes.has(route))) {
      current = route;
      await visit(page, route, errors);
    }
  } catch (error) {
    errors.push(`script: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await browser.close();
  }

  console.log(
    errors.length === 0 ? '\nBROWSER ERRORS: none' : `\nBROWSER ERRORS:\n${errors.join('\n')}`,
  );
  stopServer();
  process.exit(errors.length === 0 ? 0 : 1);
}

main().catch((error) => fail(error instanceof Error ? error.stack : String(error)));
