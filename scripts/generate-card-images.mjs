// Pre-generates a JPEG of the pillarbox-card view for every valid (month, day)
// that has devotional content, writing them into dist/cards/MM-DD.jpg so they
// can be referenced by the Trigger Email extension as inline attachments.
//
// Run after `vite build` — this script spins up `vite preview` against the
// built bundle, drives a real Chrome via puppeteer-core, and screenshots each
// card. Days that have no seed (so the page renders without a title) are
// skipped silently.
//
// Prerequisites:
//   - dist/ must exist (run `npm run build` first)
//   - System Chrome installed at /Applications/Google Chrome.app/
//   - puppeteer-core devDependency
//
// Usage:  node scripts/generate-card-images.mjs

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// 1400×900 forces pillarbox mode (viewport AR ≈ 1.56 > image AR 0.71). The
// card lands at ~635px wide, ~852px tall, centered. We grab the card-screen
// bounding box exactly — no padding, no rounded corners, no drop shadow —
// so the exported JPEG is "pure card": rectangular with the photo background
// filling edge-to-edge. The live UI keeps its rounded floating treatment;
// only the screenshot pipeline strips that chrome (see strippedStyle below).
// deviceScaleFactor=3 renders the screenshot at 3× device pixels per CSS pixel
// so the served JPEG is ~2080×2820 — crisp at any retina density.
const VIEWPORT = { width: 1400, height: 900, deviceScaleFactor: 3 };

const daysInMonth = (month) => new Date(2024, month, 0).getDate(); // 2024 is leap year — yields 29 for Feb

async function waitForServer(deadlineMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok) return;
    } catch {
      // server not yet listening; retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`vite preview did not respond on ${BASE_URL} within ${deadlineMs}ms`);
}

async function main() {
  const outDir = resolve(process.cwd(), 'dist/cards');
  await mkdir(outDir, { recursive: true });

  console.log(`Starting vite preview on :${PORT}...`);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  let browser;
  try {
    await waitForServer();
    console.log(`Launching Chrome at ${CHROME_PATH}...`);
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    // Pin the theme to light regardless of the host OS setting — otherwise
    // macOS-in-dark-mode causes the ThemeProvider to apply data-theme="dark"
    // and the rendered card is barely legible against the photo.
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    // Disable every CSS animation + transition globally so the bbox we read
    // for the screenshot is the final settled layout, not a frame mid-transition.
    // The pillarbox transition on .card-screen and the pageIn keyframe on
    // #root > * otherwise let getBoundingClientRect race with the screenshot.
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        /* Flat-crop the exported card: square corners + no surrounding shadow
           so the bbox-tight clip below produces a pure rectangular image. */
        .card-screen {
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      `;
      // append once <head> exists
      const inject = () => document.head && document.head.appendChild(style);
      if (document.head) inject();
      else document.addEventListener('DOMContentLoaded', inject, { once: true });
    });

    let generated = 0;
    let skipped = 0;

    for (let m = 1; m <= 12; m++) {
      const maxDay = daysInMonth(m);
      for (let d = 1; d <= maxDay; d++) {
        const url = `${BASE_URL}/card/${m}/${d}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });

        // The card renders the date + (if seed exists) title/verse. Skip days
        // with no seed — no title means there's nothing meaningful to mail.
        const hasContent = await page
          .waitForSelector('.card-title', { timeout: 2500 })
          .then(() => true)
          .catch(() => false);

        if (!hasContent) {
          skipped++;
          continue;
        }

        // Make sure web fonts are fully painted before we screenshot.
        await page.evaluate(() => document.fonts.ready);
        // The hero photo is a 2 MB asset — networkidle0 fires before it's
        // fully decoded if Vite streams the bytes in chunks. Block on the
        // <img> element's `complete + naturalWidth` so the photo is actually
        // painted, otherwise we screenshot an empty paper rectangle.
        await page.waitForFunction(
          () => {
            const img = document.querySelector('.card-screen-bg');
            return img && img.complete && img.naturalWidth > 0;
          },
          { timeout: 15_000 },
        );
        // Strip the floating UI that doesn't belong in the email image and
        // read the post-strip layout in the same evaluate() so we never see
        // a stale bbox in JS-land. (Transitions are disabled globally above,
        // so the box is the final one — but we still read it in-page to keep
        // the measurement next to the screenshot in time.)
        const box = await page.evaluate(() => {
          document.querySelector('.card-back')?.remove();
          document.querySelector('.card-screen-actions')?.remove();
          const r = document.querySelector('.card-screen').getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        });
        if (!box || !box.w || !box.h) {
          skipped++;
          continue;
        }

        const filename = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}.jpg`;
        // Defensive: something on this machine occasionally removes dist/cards
        // mid-run (likely an indexer / IDE / file-watcher). Re-asserting the
        // directory before each write costs ~microseconds and avoids ENOENT.
        await mkdir(outDir, { recursive: true });
        // JPEG at quality 88 is visually indistinguishable from lossless on the
        // photographic background and produces ~400 KB files instead of the
        // ~3.5 MB PNGs that DSF=3 was emitting. Smaller inline attachments mean
        // faster delivery, less mailbox bloat, and lower Hosting egress cost.
        await page.screenshot({
          path: resolve(outDir, filename),
          type: 'jpeg',
          quality: 88,
          clip: {
            x: Math.max(0, Math.floor(box.x)),
            y: Math.max(0, Math.floor(box.y)),
            width: Math.ceil(box.w),
            height: Math.ceil(box.h),
          },
        });
        generated++;
        if (generated % 30 === 0) {
          console.log(`  ${generated} generated so far (last: ${filename})`);
        }
      }
    }

    console.log(`\nDone. Generated ${generated} card PNGs, skipped ${skipped} day(s) with no seed.`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    preview.kill('SIGTERM');
    // Give vite preview a moment to release the port before the process exits.
    await new Promise((r) => setTimeout(r, 200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
