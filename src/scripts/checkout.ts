import { CART_EVENT, loadCart, saveCart } from '../lib/cart';
import { ORDER_KEY, createOrder, validateShipping, type FieldErrors, type ShippingForm } from '../lib/order';

const SIMULATED_DELAY_MS = 900;
const FIELDS: (keyof ShippingForm)[] = ['firstName', 'lastName', 'email', 'address', 'postcode', 'city'];

function readForm(form: HTMLFormElement): ShippingForm {
  const data = new FormData(form);
  return Object.fromEntries(FIELDS.map((f) => [f, String(data.get(f) ?? '')])) as unknown as ShippingForm;
}

function showErrors(form: HTMLFormElement, errors: FieldErrors): void {
  const summary = form.querySelector<HTMLElement>('[data-error-summary]')!;
  const list = form.querySelector<HTMLElement>('[data-error-list]')!;
  const items: HTMLLIElement[] = [];

  for (const field of FIELDS) {
    const input = form.querySelector<HTMLInputElement>(`#${field}`)!;
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`)!;
    const message = errors[field] ?? '';
    slot.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (!message) continue;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${field}`;
    a.textContent = message;
    li.append(a);
    items.push(li);
  }
  list.replaceChildren(...items);
  summary.hidden = items.length === 0;
  if (items.length) summary.focus();
}

export function initCheckout(): void {
  const form = document.querySelector<HTMLFormElement>('[data-checkout-form]');
  const grid = document.querySelector<HTMLElement>('[data-checkout]');
  const empty = document.querySelector<HTMLElement>('[data-checkout-empty]');
  if (!form || !grid || !empty) return;

  const syncEmpty = () => {
    const isEmpty = loadCart().length === 0;
    grid.hidden = isEmpty;
    empty.hidden = !isEmpty;
  };
  syncEmpty();
  window.addEventListener(CART_EVENT, syncEmpty);

  // Re-validate a field once the user leaves it, only if it was already flagged.
  form.addEventListener('focusout', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.getAttribute('aria-invalid') !== 'true') return;
    const message = validateShipping(readForm(form))[input.name as keyof ShippingForm] ?? '';
    form.querySelector(`[data-error-for="${input.name}"]`)!.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cart = loadCart();
    if (cart.length === 0) return syncEmpty();

    const shipping = readForm(form);
    const errors = validateShipping(shipping);
    showErrors(form, errors);
    if (Object.keys(errors).length) return;

    const button = form.querySelector<HTMLButtonElement>('[data-submit]')!;
    const label = form.querySelector<HTMLElement>('[data-submit-label]')!;
    const status = form.querySelector<HTMLElement>('[data-form-status]')!;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    label.textContent = 'Envoi simulé…';
    status.textContent = 'Validation de la commande fictive en cours.';

    setTimeout(() => {
      try {
        sessionStorage.setItem(ORDER_KEY, JSON.stringify(createOrder(cart, shipping)));
      } catch {
        status.textContent =
          'Votre navigateur bloque le stockage de session : la confirmation ne pourra pas afficher le détail.';
      }
      saveCart([]);
      location.assign('/confirmation');
    }, SIMULATED_DELAY_MS);
  });
}
