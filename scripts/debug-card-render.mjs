// Screenshot using EXACT bbox (no padding). Output should be only the card,
// with no paper margins.
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitForServer(deadlineMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    try {
      const r = await fetch(BASE_URL);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('preview did not start');
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'inherit', 'inherit'],
});

try {
  await waitForServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(`${BASE_URL}/card/5/16`, { waitUntil: 'networkidle0' });

  await page.waitForSelector('.card-title', { timeout: 5000 });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(
      () => {
        const img = document.querySelector('.card-screen-bg');
        return img && img.complete && img.naturalWidth > 0;
      },
      { timeout: 10_000 },
    )
    .catch(() => {});
  await page.evaluate(() => {
    document.querySelector('.card-back')?.remove();
    document.querySelector('.card-screen-actions')?.remove();
  });
  await new Promise((r) => setTimeout(r, 600));

  // Use elementHandle.screenshot for an exact element clip — no math.
  const cardScreen = await page.$('.card-screen');
  await cardScreen.screenshot({ path: '/tmp/debug-exact.png', type: 'png' });

  const box = await cardScreen.boundingBox();
  console.log('bbox:', box);

  // Also do the manual clip without any padding, for comparison.
  await page.screenshot({
    path: '/tmp/debug-noPad.png',
    type: 'png',
    clip: {
      x: Math.floor(box.x),
      y: Math.floor(box.y),
      width: Math.ceil(box.width),
      height: Math.ceil(box.height),
    },
  });
  await browser.close();
} finally {
  preview.kill('SIGTERM');
}
