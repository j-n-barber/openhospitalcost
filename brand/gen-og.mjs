// brand/gen-og.mjs
// Generates the social share image + apple touch icon by rendering branded HTML
// with Playwright (real Source Serif / Inter fonts, exact pixel sizes). Outputs:
//   apps/web/public/og.png        1200×630  (og:image / twitter card)
//   apps/web/app/apple-icon.png   180×180   (iOS home-screen icon)
// Re-run after brand changes:  node brand/gen-og.mjs

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = resolve(__dirname, '..');
const icon = readFileSync(resolve(__dirname, 'Logo_Icon.svg'), 'utf8')
  .replace(/<\?xml[^>]*\?>/, '')
  .trim();

const FONTS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;

const ogHtml = `<!doctype html><html><head><meta charset="utf-8">${FONTS}
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1200px; height:630px; background:#FAF9F6;
    background-image: radial-gradient(circle at 1px 1px, rgba(19,40,58,.04) 1px, transparent 0);
    background-size: 26px 26px; font-family:'Inter',sans-serif; color:#13283A;
    padding:74px 80px; display:flex; flex-direction:column; justify-content:space-between; }
  .brand { display:flex; align-items:center; gap:18px; }
  .brand svg { width:64px; height:60px; }
  .brand .wm { font-family:'Source Serif 4',serif; font-weight:700; font-size:42px; letter-spacing:-.01em; }
  .brand .wm .o { color:#1A6B7A; }
  .eyebrow { font-family:'IBM Plex Mono',monospace; font-size:20px; letter-spacing:.14em; text-transform:uppercase; color:#1A6B7A; margin-bottom:22px; }
  h1 { font-family:'Source Serif 4',serif; font-weight:700; font-size:82px; line-height:1.02; letter-spacing:-.02em; max-width:16ch; }
  h1 em { font-style:italic; color:#12545F; }
  p { font-size:30px; line-height:1.4; color:#34495a; margin-top:26px; max-width:30ch; }
  .foot { display:flex; justify-content:space-between; align-items:flex-end; }
  .url { font-family:'IBM Plex Mono',monospace; font-size:22px; color:#5B6670; }
  .tag { font-family:'IBM Plex Mono',monospace; font-size:18px; color:#5B6670; }
</style></head><body>
  <div class="brand">${icon}<span class="wm"><span class="o">Open</span>HospitalCost</span></div>
  <div>
    <div class="eyebrow">Sourced from federally-mandated price files</div>
    <h1>See what hospitals <em>actually</em> charge.</h1>
    <p>Real gross, cash &amp; negotiated prices — cited to the source.</p>
  </div>
  <div class="foot"><span class="url">openhospitalcost.com</span><span class="tag">Not estimates. The actual numbers.</span></div>
</body></html>`;

const appleHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:180px;height:180px;background:#FAF9F6;display:flex;align-items:center;justify-content:center;}
  svg{width:128px;height:120px;}
</style></head><body>${icon}</body></html>`;

const browser = await chromium.launch();
try {
  // OG image
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.setContent(ogHtml, { waitUntil: 'networkidle' });
  await og.waitForTimeout(400); // let webfonts settle
  await og.screenshot({ path: resolve(repo, 'apps/web/public/og.png') });
  console.log('wrote apps/web/public/og.png (1200×630)');

  // Apple touch icon
  const ap = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await ap.setContent(appleHtml, { waitUntil: 'load' });
  await ap.screenshot({ path: resolve(repo, 'apps/web/app/apple-icon.png') });
  console.log('wrote apps/web/app/apple-icon.png (180×180)');
} finally {
  await browser.close();
}
