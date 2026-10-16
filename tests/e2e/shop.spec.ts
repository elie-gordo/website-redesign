import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
}

// The entry screen opens every arrival on the site; every test but its own starts past it.
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith('entry screen')) return;
  await page.addInitScript(() => sessionStorage.setItem('tensil-intro-skip', '1'));
});

test('entry screen: every arrival opens on it, the button opens the site', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: /TENSIL/ });
  await expect(dialog).toBeVisible();
  // The site behind is inert until the visitor enters.
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  // The button fades in as the lamp settles: click it once a visitor could see it.
  const enter = dialog.getByRole('button', { name: /Découvrir la lampe/ });
  await expect(enter).toHaveCSS('opacity', '1');
  await enter.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  await expect(page.getByRole('button', { name: /Ajouter au panier/ })).toBeVisible();
  // Coming back from another page of the site: straight to the store.
  await page.goto('/panier');
  await Promise.all([page.waitForURL(/\/$/), page.evaluate(() => (location.href = '/'))]);
  await expect(page.getByRole('heading', { name: 'TENSIL', level: 1 })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /TENSIL/ })).toHaveCount(0);
  // A new arrival (reload counts: the referrer stays external) opens on it again.
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: /TENSIL/ })).toBeVisible();
});

test('entry screen: the header wordmark brings it back', async ({ page }) => {
  await page.goto('/panier');
  await page.getByRole('link', { name: 'TENSIL, page d’entrée' }).click();
  const dialog = page.getByRole('dialog', { name: /TENSIL/ });
  await expect(dialog).toBeVisible();
  const enter = dialog.getByRole('button', { name: /Découvrir la lampe/ });
  await expect(enter).toHaveCSS('opacity', '1');
  await enter.click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test('entry screen: no intro outside the home page', async ({ page }) => {
  await page.goto('/panier');
  await expect(page.getByRole('dialog', { name: /TENSIL/ })).toHaveCount(0);
});

test('choosing a colorway updates the label, the poster and the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Sauge' }).check({ force: true });
  await expect(page.locator('[data-colorway-name]')).toHaveText('Sauge');
  await expect(page.locator('[data-poster]')).toHaveAttribute('alt', /Sauge/);
  await expect(page).toHaveURL(/coloris=sauge/);
});

test('the colorway in the URL is restored on load', async ({ page }) => {
  await page.goto('/?coloris=creme');
  await expect(page.getByRole('radio', { name: 'Crème' })).toBeChecked();
});

test('the 3D viewer is not loaded until the visitor shows intent', async ({ page }) => {
  const glb: string[] = [];
  page.on('request', (r) => r.url().endsWith('.glb') && glb.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(glb).toEqual([]);
  await expect(page.getByRole('button', { name: /Tourner en 3D/ })).toBeVisible();
});

test('the 3D viewer loads on demand and can be rotated from the keyboard', async ({ page }) => {
  await page.goto('/');
  // Keyboard path: focusing the button is enough intent; Enter is the explicit request.
  await page.getByRole('button', { name: /Tourner en 3D/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-stage]')).toHaveAttribute('data-mode', '3d', { timeout: 20_000 });
  const viewer = page.getByRole('group', { name: /Vue 3D de TENSIL/ });
  await viewer.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Vue initiale' })).toBeVisible();
});

test('full journey: add to cart, adjust quantity, simulated checkout, confirmation', async ({ page }) => {
  await page.goto('/?coloris=oxyde');
  await page.getByRole('button', { name: /Ajouter au panier/ }).click();

  const drawer = page.getByRole('dialog', { name: 'Votre panier' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('status')).toContainText('Oxyde');
  await drawer.getByRole('button', { name: 'Ajouter une lampe Oxyde' }).click();
  await expect(drawer.locator('[data-cart-subtotal]')).toHaveText(/498/);
  await expect(page.locator('[data-cart-count]')).toHaveText('2');

  await drawer.getByRole('link', { name: /Commander/ }).click();
  await expect(page).toHaveURL(/\/commande/);

  // Submitting empty shows the error summary and flags fields.
  await page.getByRole('button', { name: /Valider la commande fictive/ }).click();
  await expect(page.getByText('Vérifiez les champs suivants :')).toBeVisible();
  await expect(page.getByLabel('Prénom')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Prénom').fill('Jeanne');
  await page.getByLabel('Nom', { exact: true }).fill('Exemple');
  await page.getByLabel('Adresse e-mail').fill('jeanne@exemple.fr');
  await page.getByLabel('Adresse', { exact: true }).fill('1 rue de la Démo');
  await page.getByLabel('Code postal').fill('69001');
  await page.getByLabel('Ville').fill('Lyon');
  await page.getByRole('button', { name: /Valider la commande fictive/ }).click();

  await expect(page).toHaveURL(/\/confirmation/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Jeanne');
  await expect(page.locator('[data-confirm-id]')).toHaveText(/^TNS-[A-Z0-9]{6}$/);
  await expect(page.locator('[data-confirm-items]')).toHaveText('2 × TENSIL Oxyde');
  await expect(page.locator('[data-cart-count]')).toHaveText('0');
});

test('empty states: cart page, checkout and confirmation without an order', async ({ page }) => {
  await page.goto('/panier');
  await expect(page.getByRole('main').getByText('Votre panier est vide.').filter({ visible: true })).toBeVisible();
  await page.goto('/commande');
  await expect(page.getByRole('main').getByText('Votre panier est vide.').filter({ visible: true })).toBeVisible();
  await page.goto('/confirmation');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aucune commande à afficher.');
});

test('unknown routes render the 404 page', async ({ page }) => {
  await page.goto('/nexiste-pas');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hors');
});

for (const path of ['/', '/panier', '/commande', '/a-propos', '/404']) {
  test(`no automatically detectable WCAG A/AA violations on ${path}`, async ({ page }) => {
    // Reduced motion shows every reveal-on-scroll block at full opacity, so axe checks all of
    // the content instead of skipping hidden blocks or measuring contrast mid-fade.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expectNoA11yViolations(page);
  });
}

test('the page never scrolls horizontally', async ({ page }) => {
  for (const path of ['/', '/panier', '/commande', '/a-propos']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
