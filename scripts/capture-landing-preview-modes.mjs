import { spawn } from 'node:child_process';

const py = spawn('python3', ['-c', `
import subprocess, time
from pathlib import Path

try:
  from playwright.sync_api import sync_playwright
except Exception:
  raise SystemExit(2)

root = Path.cwd()
out_dir = root / 'screenshots'
out_dir.mkdir(exist_ok=True)

server = subprocess.Popen(
  ['python3', '-m', 'http.server', '4173', '--bind', '0.0.0.0', '--directory', str(root)],
  stdout=subprocess.DEVNULL,
  stderr=subprocess.DEVNULL,
)

try:
  time.sleep(0.8)
  with sync_playwright() as p:
    browser = p.firefox.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    page.goto('http://127.0.0.1:4173/index.html', wait_until='networkidle')
    page.wait_for_timeout(500)

    page.click('#desktopPreviewModeBtn')
    page.wait_for_timeout(250)
    page.screenshot(path=str(out_dir / 'landing-preview-desktop.png'), full_page=True)

    page.click('#mobilePreviewModeBtn')
    page.wait_for_timeout(250)
    page.screenshot(path=str(out_dir / 'landing-preview-mobile.png'), full_page=True)

    browser.close()
finally:
  server.terminate()
`]);

const exitCode = await new Promise((resolve) => py.on('close', resolve));
if (exitCode !== 0) {
  console.error('Unable to capture preview mode screenshots in this environment.');
  process.exit(exitCode || 1);
}

console.log('Saved screenshots/landing-preview-desktop.png and screenshots/landing-preview-mobile.png');
