import { chromium } from '@playwright/test';
import http from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const rootDir = resolve('.');
const artifactPath = 'artifacts/appointments-added-mobile.png';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json'
};

function startServer(port = 4173) {
  const server = http.createServer(async (req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = join(rootDir, urlPath);
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'text/plain; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolveServer) => {
    server.listen(port, () => resolveServer({ server, url: `http://127.0.0.1:${port}/index.html#/app` }));
  });
}

const { server, url } = await startServer();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#section-appointments', { timeout: 10000 });

  const title = `Mobile Appt ${Date.now()}`;
  const date = '2026-02-20';

  await page.click('#addAppointmentBtn');
  await page.fill('#appointmentModalTitleInput', title);
  await page.fill('#appointmentModalDateInput', date);
  await page.click('[data-action="save-appointment-modal"]');

  await page.locator('#appointmentsList .appointment-title', { hasText: title }).first().waitFor({ timeout: 10000 });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: artifactPath, fullPage: true });
  console.log(`PASS: appointment created and visible (${title})`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
