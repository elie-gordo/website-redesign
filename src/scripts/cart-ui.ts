import { CART_EVENT, CART_KEY, countItems, loadCart, saveCart, setQty, subtotal, type CartLine } from '../lib/cart';
import type { ColorwayId } from '../data/product';

interface CartConfig {
  swatches: Record<ColorwayId, { name: string; hex: string }>;
  price: number;
  maxQty: number;
}

const price = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

function readConfig(): CartConfig | null {
  const el = document.getElementById('cart-config');
  try {
    return el?.textContent ? (JSON.parse(el.textContent) as CartConfig) : null;
  } catch {
    return null;
  }
}

function renderLine(line: CartLine, config: CartConfig, tpl: HTMLTemplateElement): DocumentFragment {
  const frag = tpl.content.cloneNode(true) as DocumentFragment;
  const { name, hex } = config.swatches[line.colorway];
  const q = <T extends Element>(sel: string) => frag.querySelector(sel) as T;

  q<HTMLElement>('.cart-line').dataset.colorway = line.colorway;
  q<HTMLElement>('.cart-line__swatch').style.background = hex;
  q<HTMLElement>('.cart-line__colorway').textContent = `· ${name}`;
  q<HTMLElement>('.cart-line__price').textContent = `${price(config.price)} l'unité`;
  q<HTMLElement>('.qty').setAttribute('aria-label', `Quantité, coloris ${name}`);
  q<HTMLElement>('.qty__value').textContent = String(line.qty);

  const minus = q<HTMLButtonElement>('[data-qty-step="-1"]');
  const plus = q<HTMLButtonElement>('[data-qty-step="1"]');
  minus.setAttribute('aria-label', `Retirer une lampe ${name}`);
  plus.setAttribute('aria-label', `Ajouter une lampe ${name}`);
  plus.disabled = line.qty >= config.maxQty;
  q<HTMLButtonElement>('[data-qty-remove]').setAttribute('aria-label', `Retirer TENSIL ${name} du panier`);
  return frag;
}

function render(cart: CartLine[], config: CartConfig): void {
  const count = countItems(cart);
  document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = String(count)));
  document.querySelectorAll('[data-cart-count-label]').forEach((el) => {
    el.textContent = count === 0 ? ', vide' : `, ${count} article${count > 1 ? 's' : ''}`;
  });
  document.querySelectorAll('[data-cart-subtotal]').forEach((el) => (el.textContent = price(subtotal(cart))));
  document.querySelectorAll<HTMLElement>('[data-cart-foot]').forEach((el) => (el.hidden = count === 0));

  const lineTpl = document.getElementById('cart-line-template') as HTMLTemplateElement | null;
  const emptyTpl = document.getElementById('cart-empty-template') as HTMLTemplateElement | null;
  if (!lineTpl || !emptyTpl) return;
  document.querySelectorAll<HTMLElement>('[data-cart-view]').forEach((view) => {
    const nodes = cart.length
      ? cart.map((l) => renderLine(l, config, lineTpl))
      : [emptyTpl.content.cloneNode(true) as DocumentFragment];
    view.replaceChildren(...nodes);
  });
}

function onViewClick(event: Event, setNotice: (msg: string) => void): void {
  const target = event.target as HTMLElement;
  const line = target.closest<HTMLElement>('.cart-line');
  const colorway = line?.dataset.colorway as ColorwayId | undefined;
  if (!colorway) return;
  const cart = loadCart();
  const current = cart.find((l) => l.colorway === colorway)?.qty ?? 0;
  const step = target.closest<HTMLElement>('[data-qty-step]')?.dataset.qtyStep;
  const removing = target.closest('[data-qty-remove]');
  if (!step && !removing) return;
  const next = removing ? 0 : current + Number(step);
  const persisted = saveCart(setQty(cart, colorway, next));
  setNotice(persisted ? '' : "Votre navigateur bloque l'enregistrement : le panier sera perdu en quittant la page.");
  if (next <= 0) document.querySelector<HTMLElement>('[data-cart-view] .qty__btn, [data-cart-close]')?.focus();
}

let drawer: HTMLDialogElement | null = null;

export function openCartDrawer(notice = ''): void {
  if (!drawer) return;
  const box = drawer.querySelector('[data-cart-notice]');
  if (box) box.textContent = notice;
  if (!drawer.open) drawer.showModal();
}

export function initCartUi(): void {
  const config = readConfig();
  if (!config) return;
  drawer = document.querySelector<HTMLDialogElement>('[data-cart-drawer]');
  const setNotice = (msg: string) =>
    document.querySelectorAll('[data-cart-notice]').forEach((el) => (el.textContent = msg));

  render(loadCart(), config);
  window.addEventListener(CART_EVENT, (e) => render((e as CustomEvent<CartLine[]>).detail, config));
  window.addEventListener('storage', (e) => e.key === CART_KEY && render(loadCart(), config));

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-cart-open]')) openCartDrawer();
    else if (t.closest('[data-cart-close]')) drawer?.close();
    else if (t.closest('[data-cart-view]')) onViewClick(e, setNotice);
  });
  // Click on the backdrop (outside the panel) closes the drawer.
  drawer?.addEventListener('click', (e) => e.target === drawer && drawer?.close());
}
