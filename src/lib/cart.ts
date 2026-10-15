import { COLORWAY_IDS, PRODUCT, type ColorwayId } from '../data/product';

export interface CartLine {
  colorway: ColorwayId;
  qty: number;
}

export const CART_KEY = 'tensil-cart-v1';
export const CART_EVENT = 'tensil:cart';

const isColorway = (v: unknown): v is ColorwayId => COLORWAY_IDS.includes(v as ColorwayId);
const clampQty = (n: number) => Math.min(PRODUCT.maxQty, Math.max(0, Math.floor(n)));

/** Parse untrusted storage content; anything malformed is dropped rather than trusted. */
export function parseCart(json: string | null): CartLine[] {
  if (!json) return [];
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .filter((l): l is CartLine => isColorway(l?.colorway) && Number.isFinite(l?.qty))
      .map((l) => ({ colorway: l.colorway, qty: clampQty(l.qty) }))
      .filter((l) => l.qty > 0);
  } catch {
    return [];
  }
}

export function setQty(cart: readonly CartLine[], colorway: ColorwayId, qty: number): CartLine[] {
  const next = clampQty(qty);
  const exists = cart.some((l) => l.colorway === colorway);
  const updated = exists
    ? cart.map((l) => (l.colorway === colorway ? { ...l, qty: next } : l))
    : [...cart, { colorway, qty: next }];
  return updated.filter((l) => l.qty > 0);
}

export function addItem(cart: readonly CartLine[], colorway: ColorwayId, qty = 1): CartLine[] {
  const current = cart.find((l) => l.colorway === colorway)?.qty ?? 0;
  return setQty(cart, colorway, current + qty);
}

export const countItems = (cart: readonly CartLine[]) => cart.reduce((n, l) => n + l.qty, 0);
export const subtotal = (cart: readonly CartLine[]) => countItems(cart) * PRODUCT.price;
export const canAddMore = (cart: readonly CartLine[], colorway: ColorwayId) =>
  (cart.find((l) => l.colorway === colorway)?.qty ?? 0) < PRODUCT.maxQty;

// ---------------------------------------------------------------- browser storage
export function loadCart(): CartLine[] {
  try {
    return parseCart(localStorage.getItem(CART_KEY));
  } catch {
    return [];
  }
}

/** Persist and notify every cart view (header counter, drawer, cart page). */
export function saveCart(cart: readonly CartLine[]): boolean {
  let persisted = true;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    persisted = false;
  }
  window.dispatchEvent(new CustomEvent<CartLine[]>(CART_EVENT, { detail: [...cart] }));
  return persisted;
}
