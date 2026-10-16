// Portfolio screenshots, all 16:9 (2880×1620), framed on real section bounds.
// Usage: npm run preview (other terminal), then `npm run screenshots`.
//        BASE_URL=https://tensil-store.vercel.app npm run screenshots
import { mkdir, rm } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = 'docs/screenshots';
const OUTPUT = { width: 2880, height: 1620 }; // 16:9
const DESKTOP = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 }; // 16:9 → 2880×1620
const MOBILE = { ...devices['iPhone 13'], deviceScaleFactor: 3 };
const BOARD = { background: '#e6e1d8', phoneHeight: 1340, gap: 110, radius: 44, border: '#d4cec3' };
const QUALITY = 84;
const CART = [
  { colorway: 'oxide', qty: 1 },
  { colorway: 'sage', qty: 1 },
];

async function save(image, name) {
  await sharp(image).resize(OUTPUT.width, OUTPUT.height).webp({ quality: QUALITY }).toFile(`${OUT}/${name}.webp`);
  console.log(`  ${name}.webp`);
}

/** Reduced motion: reveal blocks fully visible, no auto-rotation, so frames are deterministic. */
async function open(context, path, cart = []) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((items) => localStorage.setItem('tensil-cart-v1', JSON.stringify(items)), cart);
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await document.fonts.ready;
  });
  return page;
}

async function show3d(page, { turns = 0 } = {}) {
  // dispatchEvent: a real pointer move would already trigger the load and hide the button.
  await page.locator('[data-load-3d]').dispatchEvent('click');
  await page.locator('[data-stage][data-mode="3d"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-viewer]').focus();
  for (let i = 0; i < Math.abs(turns); i++) await page.keyboard.press(turns > 0 ? 'ArrowRight' : 'ArrowLeft');
  // Hide the drag hint and the focus ring: they are interaction aids, not part of the composition.
  await page.addStyleTag({ content: '[data-hint]{display:none!important} [data-viewer]{outline:none!important}' });
  await page.waitForTimeout(1500);
}

/**
 * 16:9 frame of a section. A section taller than the frame is cropped evenly around its
 * centre; a shorter one is captured alone and extended with its own background colour, so
 * neighbouring sections never leak into the frame.
 */
async function frame(page, selector, name) {
  const { top, height, width, background } = await page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      top: r.top + window.scrollY,
      height: r.height,
      width: document.documentElement.clientWidth,
      // A transparent section shows the page behind it: extend with the first opaque ancestor.
      background: (() => {
        for (let node = el; node; node = node.parentElement) {
          const bg = getComputedStyle(node).backgroundColor;
          if (bg !== 'transparent' && !bg.endsWith(', 0)')) return bg;
        }
        return '#ffffff';
      })(),
    };
  });
  const frameHeight = Math.round((width * 9) / 16);
  if (height >= frameHeight) {
    const y = top + (height - frameHeight) / 2;
    await save(await page.screenshot({ fullPage: true, clip: { x: 0, y, width, height: frameHeight } }), name);
    return;
  }
  // 1px inset: sub-pixel layout would otherwise pull in the neighbour's border line.
  const shot = await page.screenshot({ fullPage: true, clip: { x: 0, y: top + 1, width, height: height - 2 } });
  const { height: shotHeight } = await sharp(shot).metadata();
  const missing = Math.round((shotHeight * frameHeight) / height) - shotHeight;
  const extended = await sharp(shot)
    .extend({ top: Math.floor(missing / 2), bottom: Math.ceil(missing / 2), background })
    .png()
    .toBuffer();
  await save(extended, name);
}

/**
 * Scroll as close as possible to `targetY` such that neither the top edge (just below the
 * sticky header) nor the bottom edge of the viewport crosses a text, field, button, image or
 * panel: the screenshot never starts or ends on half an element.
 */
async function scrollToCleanEdge(page, targetY, maxShift = 600) {
  await page.evaluate(([target, maxShift]) => {
    const header = document.querySelector('header');
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    // The header only sticks once the demo banner above it has fully scrolled away.
    const stickFrom = (header?.getBoundingClientRect().top ?? 0) + window.scrollY;
    const rects = (selector) =>
      [...document.querySelectorAll(selector)]
        .filter((el) => !header?.contains(el))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ top: r.top + window.scrollY, bottom: r.bottom + window.scrollY }));
    const text = rects('p,h1,h2,h3,li,label,input,button,a,summary,dt,dd,legend,aside');
    const media = rects('img,canvas');
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const crosses = (blocks, line) => blocks.some((b) => b.top < line && b.bottom > line);
    // Bottom edge: nothing may be cut. Top edge (under the sticky header): a large image may be
    // cropped, text may not. At y = 0 nothing is hidden.
    const clean = (y) =>
      !crosses([...text, ...media], y + window.innerHeight - 8) &&
      (y === 0 || (y >= stickFrom && !crosses(text, y + headerHeight + 2)));
    for (let d = 0; d <= maxShift; d += 2) {
      for (const y of [target + d, target - d]) {
        if (y >= 0 && y <= maxY && clean(y)) {
          window.scrollTo(0, y);
          return;
        }
      }
    }
    window.scrollTo(0, target);
  }, [targetY, maxShift]);
  await page.waitForTimeout(300);
}

/** Phone screens side by side on a 16:9 board in the site's palette (rounded, hairline border). */
async function board(screens, name) {
  const { phoneHeight, gap, radius } = BOARD;
  const meta = await sharp(screens[0]).metadata();
  const phoneWidth = Math.round((phoneHeight * meta.width) / meta.height);
  const mask = Buffer.from(
    `<svg width="${phoneWidth}" height="${phoneHeight}"><rect width="100%" height="100%" rx="${radius}" ry="${radius}"/></svg>`,
  );
  const outline = Buffer.from(
    `<svg width="${phoneWidth}" height="${phoneHeight}"><rect x="1" y="1" width="${phoneWidth - 2}" height="${phoneHeight - 2}" rx="${radius}" ry="${radius}" fill="none" stroke="${BOARD.border}" stroke-width="2"/></svg>`,
  );
  const phones = await Promise.all(
    screens.map((png) =>
      sharp(png)
        .resize(phoneWidth, phoneHeight)
        .composite([{ input: mask, blend: 'dest-in' }, { input: outline }])
        .png()
        .toBuffer(),
    ),
  );
  const total = phones.length * phoneWidth + (phones.length - 1) * gap;
  const left = Math.round((OUTPUT.width - total) / 2);
  const top = Math.round((OUTPUT.height - phoneHeight) / 2);
  const canvas = sharp({
    create: { width: OUTPUT.width, height: OUTPUT.height, channels: 3, background: BOARD.background },
  }).composite(phones.map((input, i) => ({ input, left: left + i * (phoneWidth + gap), top })));
  await save(await canvas.png().toBuffer(), name);
}

async function fillInvalidCheckout(page) {
  await page.getByLabel('Prénom').fill('Jeanne');
  await page.getByLabel('Adresse e-mail').fill('jeanne@');
  await page.getByRole('button', { name: /Valider la commande fictive/ }).click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
}

async function desktop(browser) {
  const ctx = await browser.newContext(DESKTOP);

  let page = await open(ctx, '/');
  await show3d(page);
  await save(await page.screenshot(), '01-produit');
  await page.close();

  page = await open(ctx, '/?coloris=oxyde');
  await show3d(page, { turns: -4 });
  await save(await page.screenshot(), '02-produit-oxyde');
  await page.close();

  page = await open(ctx, '/');
  await frame(page, '.night', '04-nuit');
  await frame(page, '#coloris', '05-coloris');
  await page.close();

  // The anatomy section is exactly one screen below the sticky header: a viewport taller by the
  // header (and the section's two border lines) makes it exactly 16:9, image edge to edge.
  const header = 64 + 2;
  const tall = await browser.newContext({ ...DESKTOP, viewport: { width: 1920, height: 1080 + header } });
  page = await open(tall, '/');
  await frame(page, '#anatomie', '03-anatomie');
  await tall.close();

  page = await open(ctx, '/commande', CART);
  await fillInvalidCheckout(page);
  await scrollToCleanEdge(page, 0);
  await save(await page.screenshot(), '06-commande-erreurs');
  await page.close();

  await ctx.close();
}

async function mobile(browser) {
  const ctx = await browser.newContext(MOBILE);
  const screens = [];

  let page = await open(ctx, '/?coloris=sauge');
  await show3d(page);
  // Small range only: the 3D stage must stay in the screen.
  await scrollToCleanEdge(page, 0, 140);
  screens.push(await page.screenshot());
  await page.close();

  page = await open(ctx, '/?coloris=sauge', [{ colorway: 'graphite', qty: 1 }]);
  await page.getByRole('button', { name: /Ajouter au panier/ }).click();
  await page.getByRole('dialog', { name: 'Votre panier' }).waitFor();
  await page.waitForTimeout(700);
  screens.push(await page.screenshot());
  await page.close();

  page = await open(ctx, '/commande', CART);
  await fillInvalidCheckout(page);
  const summaryTop = await page.locator('[data-error-summary]').evaluate((el) => el.getBoundingClientRect().top);
  await scrollToCleanEdge(page, summaryTop - 120);
  screens.push(await page.screenshot());
  await page.close();

  await board(screens, '07-mobile');
  await ctx.close();
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
console.log(`Screenshots of ${BASE}`);
const browser = await chromium.launch();
try {
  await desktop(browser);
  await mobile(browser);
} finally {
  await browser.close();
}
