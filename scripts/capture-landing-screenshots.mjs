import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const screenshotsDir = resolve(root, 'screenshots');
await fs.mkdir(screenshotsDir, { recursive: true });

async function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) return resolvePromise(stdout.trim());
      reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || stdout}`));
    });
  });
}

async function startServer(dir, port) {
  const child = spawn('python3', ['-m', 'http.server', String(port), '-d', dir], {
    cwd: root,
    stdio: 'ignore'
  });
  await new Promise((r) => setTimeout(r, 500));
  return child;
}

const tempBefore = mkdtempSync(join(tmpdir(), 'focusflow-before-'));
await fs.cp(resolve(root, 'assets'), resolve(tempBefore, 'assets'), { recursive: true });
await fs.cp(resolve(root, 'manifest.webmanifest'), resolve(tempBefore, 'manifest.webmanifest'));
await fs.cp(resolve(root, 'sw.js'), resolve(tempBefore, 'sw.js'));

let beforeIndex;
try {
  beforeIndex = await run('git', ['show', 'HEAD:index.html']);
} catch {
  beforeIndex = await fs.readFile(resolve(root, 'index.html'), 'utf8');
}
await fs.writeFile(resolve(tempBefore, 'index.html'), beforeIndex, 'utf8');

const beforeServer = await startServer(tempBefore, 4173);
const afterServer = await startServer(root, 4174);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await page.locator('.landing-hero').screenshot({ path: resolve(screenshotsDir, 'landing-before.png') });

  await page.goto('http://127.0.0.1:4174/#/', { waitUntil: 'networkidle' });
  await page.locator('.landing-hero').screenshot({ path: resolve(screenshotsDir, 'landing-after.png') });
} finally {
  await browser.close();
  beforeServer.kill('SIGTERM');
  afterServer.kill('SIGTERM');
}

console.log('Saved screenshots/landing-before.png and screenshots/landing-after.png');
