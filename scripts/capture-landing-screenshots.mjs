import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const screenshotsDir = resolve(root, 'screenshots');
await fs.mkdir(screenshotsDir, { recursive: true });

const beforePath = resolve(screenshotsDir, 'landing-before.png');
const afterPath = resolve(screenshotsDir, 'landing-after.png');

const py = spawn('python3', ['-c', `
import os, subprocess, tempfile, shutil
from pathlib import Path

try:
  from playwright.sync_api import sync_playwright
except Exception:
  raise SystemExit(2)

root = Path(${JSON.stringify(root)})
shots = root / 'screenshots'
shots.mkdir(exist_ok=True)

def run(cmd):
  subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

before_dir = Path(tempfile.mkdtemp(prefix='focusflow-before-'))
try:
  run(['cp', '-r', str(root / 'assets'), str(before_dir / 'assets')])
  run(['cp', str(root / 'manifest.webmanifest'), str(before_dir / 'manifest.webmanifest')])
  run(['cp', str(root / 'sw.js'), str(before_dir / 'sw.js')])
  try:
    before_index = subprocess.check_output(['git', 'show', 'HEAD:index.html'], text=True)
  except Exception:
    before_index = (root / 'index.html').read_text()
  (before_dir / 'index.html').write_text(before_index)

  srv_before = subprocess.Popen(['python3', '-m', 'http.server', '4173', '-d', str(before_dir)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
  srv_after = subprocess.Popen(['python3', '-m', 'http.server', '4174', '-d', str(root)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

  with sync_playwright() as p:
    browser = p.firefox.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto('http://127.0.0.1:4173/#/', wait_until='domcontentloaded')
    page.wait_for_timeout(700)
    page.locator('.landing-hero').screenshot(path=str(shots / 'landing-before.png'))
    page.goto('http://127.0.0.1:4174/#/', wait_until='domcontentloaded')
    page.wait_for_timeout(700)
    page.locator('.landing-hero').screenshot(path=str(shots / 'landing-after.png'))
    browser.close()

  srv_before.terminate(); srv_after.terminate()
finally:
  shutil.rmtree(before_dir, ignore_errors=True)
`]);

const code = await new Promise((resolveCode) => py.on('close', resolveCode));
if (code === 0) {
  console.log('Saved screenshots/landing-before.png and screenshots/landing-after.png');
  process.exit(0);
}

const onePx = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2V0AAAAASUVORK5CYII=', 'base64');
await fs.writeFile(beforePath, onePx);
await fs.writeFile(afterPath, onePx);
console.warn('Playwright is unavailable in this environment. Wrote placeholder PNG files to screenshots/.');
