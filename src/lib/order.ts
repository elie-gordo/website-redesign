import type { CartLine } from './cart';
import { subtotal } from './cart';

export const ORDER_KEY = 'tensil-order-v1';

export interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  postcode: string;
  city: string;
}

export interface Order {
  id: string;
  createdAt: string;
  items: CartLine[];
  total: number;
  shipping: ShippingForm;
}

export type FieldErrors = Partial<Record<keyof ShippingForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE_FR = /^\d{5}$/;

export function validateShipping(form: ShippingForm): FieldErrors {
  const errors: FieldErrors = {};
  const required: [keyof ShippingForm, string][] = [
    ['firstName', 'Indiquez votre prénom.'],
    ['lastName', 'Indiquez votre nom.'],
    ['email', 'Indiquez votre adresse e-mail.'],
    ['address', 'Indiquez votre adresse.'],
    ['postcode', 'Indiquez votre code postal.'],
    ['city', 'Indiquez votre ville.'],
  ];
  for (const [field, message] of required) {
    if (!form[field].trim()) errors[field] = message;
  }
  if (!errors.email && !EMAIL.test(form.email.trim())) {
    errors.email = 'Format attendu : nom@domaine.fr';
  }
  if (!errors.postcode && !POSTCODE_FR.test(form.postcode.trim())) {
    errors.postcode = 'Le code postal doit contenir 5 chiffres.';
  }
  return errors;
}

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function fictitiousOrderId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 6; i++) id += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  return `TNS-${id}`;
}

export function createOrder(items: CartLine[], shipping: ShippingForm, now = new Date()): Order {
  return {
    id: fictitiousOrderId(),
    createdAt: now.toISOString(),
    items: items.map((l) => ({ ...l })),
    total: subtotal(items),
    shipping: { ...shipping },
  };
}

export function parseOrder(json: string | null): Order | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Order;
    return typeof o?.id === 'string' && Array.isArray(o.items) && typeof o.total === 'number' ? o : null;
  } catch {
    return null;
  }
}
