import { describe, expect, test } from 'vitest';
import { addItem, canAddMore, countItems, parseCart, setQty, subtotal } from '../../src/lib/cart';
import { linearToHex } from '../../src/lib/color';
import { COLORWAYS, PRODUCT, colorwayFromSlug } from '../../src/data/product';

describe('parseCart', () => {
  test('returns an empty cart for missing or malformed storage', () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart('not json')).toEqual([]);
    expect(parseCart('{"colorway":"sage"}')).toEqual([]);
  });

  test('drops unknown colorways and clamps quantities to 1..max', () => {
    const raw = JSON.stringify([
      { colorway: 'sage', qty: 99 },
      { colorway: 'gold', qty: 1 },
      { colorway: 'oxide', qty: 0 },
      { colorway: 'cream', qty: '2' },
      { colorway: 'graphite', qty: 2.7 },
    ]);
    expect(parseCart(raw)).toEqual([
      { colorway: 'sage', qty: PRODUCT.maxQty },
      { colorway: 'graphite', qty: 2 },
    ]);
  });
});

describe('cart updates', () => {
  test('addItem creates a line, then increments it without mutating the input', () => {
    const empty = Object.freeze([]) as [];
    const one = addItem(empty, 'sage');
    const two = addItem(one, 'sage');
    expect(one).toEqual([{ colorway: 'sage', qty: 1 }]);
    expect(two).toEqual([{ colorway: 'sage', qty: 2 }]);
    expect(empty).toEqual([]);
  });

  test('quantity never exceeds the maximum per colorway', () => {
    let cart = setQty([], 'oxide', PRODUCT.maxQty);
    expect(canAddMore(cart, 'oxide')).toBe(false);
    cart = addItem(cart, 'oxide');
    expect(cart).toEqual([{ colorway: 'oxide', qty: PRODUCT.maxQty }]);
  });

  test('setting a quantity to 0 removes the line', () => {
    const cart = setQty(addItem([], 'cream'), 'cream', 0);
    expect(cart).toEqual([]);
  });

  test('totals sum every colorway at the fictitious unit price', () => {
    const cart = addItem(addItem(addItem([], 'sage'), 'sage'), 'graphite');
    expect(countItems(cart)).toBe(3);
    expect(subtotal(cart)).toBe(3 * PRODUCT.price);
  });
});

describe('colorways', () => {
  test('linear Blender values convert to the expected sRGB hex', () => {
    expect(linearToHex([0, 0, 0])).toBe('#000000');
    expect(linearToHex([1, 1, 1])).toBe('#ffffff');
    // Linear 0.2159 is sRGB mid-grey (0.502 → 128).
    expect(linearToHex([0.2159, 0.2159, 0.2159])).toBe('#808080');
  });

  test('every colorway has a distinct swatch and resolves from its URL slug', () => {
    expect(new Set(COLORWAYS.map((c) => c.hex)).size).toBe(COLORWAYS.length);
    expect(colorwayFromSlug('sauge')).toBe('sage');
    expect(colorwayFromSlug('creme')).toBe('cream');
    expect(colorwayFromSlug('inconnu')).toBeNull();
  });
});
