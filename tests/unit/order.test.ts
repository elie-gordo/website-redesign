import { describe, expect, test } from 'vitest';
import { createOrder, fictitiousOrderId, parseOrder, validateShipping, type ShippingForm } from '../../src/lib/order';

const valid: ShippingForm = {
  firstName: 'Jeanne',
  lastName: 'Exemple',
  email: 'jeanne@exemple.fr',
  address: '1 rue de la Démo',
  postcode: '69001',
  city: 'Lyon',
};

describe('validateShipping', () => {
  test('accepts a complete form', () => {
    expect(validateShipping(valid)).toEqual({});
  });

  test('flags every empty field, including whitespace-only values', () => {
    const empty = Object.fromEntries(Object.keys(valid).map((k) => [k, '  '])) as unknown as ShippingForm;
    expect(Object.keys(validateShipping(empty)).sort()).toEqual(Object.keys(valid).sort());
  });

  test('rejects a malformed e-mail and a non-French postcode', () => {
    const errors = validateShipping({ ...valid, email: 'jeanne@', postcode: '6900' });
    expect(errors.email).toMatch(/Format/);
    expect(errors.postcode).toMatch(/5 chiffres/);
  });
});

describe('orders', () => {
  test('fictitious ids use the TNS- prefix and an unambiguous alphabet', () => {
    expect(fictitiousOrderId(() => 0)).toBe('TNS-AAAAAA');
    expect(fictitiousOrderId()).toMatch(/^TNS-[A-HJ-NP-Z2-9]{6}$/);
  });

  test('createOrder snapshots items and total; parseOrder round-trips it', () => {
    const items = [{ colorway: 'sage' as const, qty: 2 }];
    const order = createOrder(items, valid, new Date('2026-10-16T10:00:00Z'));
    items[0].qty = 5;
    expect(order.items[0].qty).toBe(2);
    expect(order.total).toBe(498);
    expect(order.createdAt).toBe('2026-10-16T10:00:00.000Z');
    expect(parseOrder(JSON.stringify(order))).toEqual(order);
  });

  test('parseOrder rejects malformed data', () => {
    expect(parseOrder(null)).toBeNull();
    expect(parseOrder('{')).toBeNull();
    expect(parseOrder('{"id":1}')).toBeNull();
  });
});
