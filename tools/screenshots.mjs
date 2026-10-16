// Portfolio screenshots, framed on real section bounds (not on manual scrolling).
// Usage: npm run preview (other terminal), then `npm run screenshots`.
//        BASE_URL=https://tensil-store.vercel.app npm run screenshots
import { mkdir, rm } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = 'docs/screenshots';
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const MOBILE = { ...devices['iPhone 13'], deviceScaleFactor: 3 };
const QUALITY = 84;
const CART = [
  { colorway: 'oxide', qty: 1 },
  { colorway: 'sage', qty: 1 },
];

async function save(png, name) {
  await sharp(png).webp({ quality: QUALITY }).toFile(`${OUT}/${name}.webp`);
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
  const viewer = page.locator('[data-viewer]');
  await viewer.focus();
  for (let i = 0; i < Math.abs(turns); i++) await page.keyboard.press(turns > 0 ? 'ArrowRight' : 'ArrowLeft');
  // Hide the drag hint and the focus ring: they are interaction aids, not part of the composition.
  await page.addStyleTag({ content: '[data-hint]{display:none!important} [data-viewer]{outline:none!important}' });
  await page.waitForTimeout(1500);
}

async function bounds(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  });
}

async function clip(page, top, bottom, name) {
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  await save(await page.screenshot({ fullPage: true, clip: { x: 0, y: top, width, height: bottom - top } }), name);
}

/** Capture one element at full page width, exactly from its top to its bottom. */
async function section(page, selector, name) {
  const { top, bottom } = await bounds(page, selector);
  await clip(page, top, bottom, name);
}

/** Capture from the top of the page (banner + header) down to the bottom of an element. */
async function pageTopTo(page, selector, name, margin = 0) {
  const { bottom } = await bounds(page, selector);
  await clip(page, 0, bottom + margin, name);
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
  await section(page, '#anatomie', '03-anatomie');
  await section(page, '.night', '04-nuit');
  await section(page, '#coloris', '05-coloris');
  await page.close();

  page = await open(ctx, '/commande', CART);
  await page.getByLabel('Prénom').fill('Jeanne');
  await page.getByLabel('Adresse e-mail').fill('jeanne@');
  await page.getByRole('button', { name: /Valider la commande fictive/ }).click();
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
  await pageTopTo(page, '[data-checkout-form]', '06-commande-erreurs', 96);
  await page.close();

  await ctx.close();
}

async function mobile(browser) {
  const ctx = await browser.newContext(MOBILE);

  let page = await open(ctx, '/?coloris=sauge');
  await show3d(page);
  await pageTopTo(page, '[data-stage]', '07-mobile-produit');
  await page.close();

  page = await open(ctx, '/?coloris=sauge', [{ colorway: 'graphite', qty: 1 }]);
  await page.getByRole('button', { name: /Ajouter au panier/ }).click();
  await page.getByRole('dialog', { name: 'Votre panier' }).waitFor();
  await page.waitForTimeout(700);
  await save(await page.screenshot(), '08-mobile-panier');
  await page.close();

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
