import { addItem, canAddMore, loadCart, saveCart } from '../lib/cart';
import { COLORWAY_IDS, type ColorwayId } from '../data/product';
import { openCartDrawer } from './cart-ui';
import type { ViewerHandle } from './viewer';

interface StageConfig {
  modelUrl: string;
  lacquerMaterial: string;
  posters: Record<ColorwayId, { src: string; srcset: string; alt: string }>;
  colorways: Record<ColorwayId, { name: string; slug: string; note: string; linear: [number, number, number] }>;
}

const KEY_STEP_DEG = 15;
const HINT_DELAY_MS = 4000;

function readConfig(): StageConfig | null {
  try {
    return JSON.parse(document.getElementById('stage-config')?.textContent ?? '') as StageConfig;
  } catch {
    return null;
  }
}

const isColorway = (v: string | null | undefined): v is ColorwayId => COLORWAY_IDS.includes(v as ColorwayId);

function colorwayFromUrl(config: StageConfig): ColorwayId | null {
  const slug = new URLSearchParams(location.search).get('coloris');
  return (Object.keys(config.colorways) as ColorwayId[]).find((id) => config.colorways[id].slug === slug) ?? null;
}

/** "Voir le film": the 2.6 MB video is only requested on click (preload="none"). */
function initFilm(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-play-film]');
  const video = document.querySelector<HTMLVideoElement>('[data-film]');
  const filmPoster = document.querySelector<HTMLElement>('[data-film-poster]');
  btn?.addEventListener('click', async () => {
    if (!video) return;
    video.hidden = false;
    filmPoster?.setAttribute('hidden', '');
    try {
      await video.play();
    } catch {
      video.focus();
    }
  });
}

export function initProduct(): void {
  initFilm();
  const config = readConfig();
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!config || !stage) return;

  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const poster = $<HTMLImageElement>('[data-poster]')!;
  const viewerHost = $<HTMLElement>('[data-viewer]')!;
  const status = $<HTMLElement>('[data-status]')!;
  const progress = $<HTMLElement>('[data-progress]')!;
  const controls = $<HTMLElement>('[data-controls]')!;
  const loadBtn = $<HTMLButtonElement>('[data-load-3d]')!;
  const hint = $<HTMLElement>('[data-hint]')!;
  const addBtn = $<HTMLButtonElement>('[data-add-to-cart]')!;
  const bar = $<HTMLElement>('[data-buybar]');
  const barBtn = $<HTMLButtonElement>('[data-add-to-cart-bar]');
  const inputs = [...document.querySelectorAll<HTMLInputElement>('[data-colorway-input]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current: ColorwayId = inputs.find((i) => i.checked)?.value as ColorwayId;
  let viewer: ViewerHandle | null = null;

  function updateAddButton(): void {
    const full = !canAddMore(loadCart(), current);
    addBtn.disabled = full;
    if (barBtn) barBtn.disabled = full;
    addBtn.title = full ? 'Quantité maximale atteinte pour ce coloris (5)' : '';
  }

  function applyColorway(id: ColorwayId, { updateUrl = true } = {}): void {
    current = id;
    const c = config!.colorways[id];
    const p = config!.posters[id];
    poster.srcset = p.srcset;
    poster.src = p.src;
    poster.alt = p.alt;
    $('[data-colorway-name]')!.textContent = c.name;
    const barName = $('[data-colorway-name-bar]');
    if (barName) barName.textContent = c.name;
    $('[data-colorway-note]')!.textContent = c.note;
    viewerHost.setAttribute(
      'aria-label',
      `Vue 3D de TENSIL, coloris ${c.name}. Flèches pour pivoter, plus et moins pour zoomer.`,
    );
    inputs.forEach((i) => (i.checked = i.value === id));
    viewer?.setColorway(c.linear);
    updateAddButton();
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set('coloris', c.slug);
      history.replaceState(null, '', url);
    }
  }

  let viewerRequested = false;

  async function startViewer(): Promise<void> {
    if (viewerRequested) return;
    viewerRequested = true;
    loadBtn.hidden = true;
    const { mountViewer, supportsWebGL } = await import('./viewer');
    if (!supportsWebGL()) {
      status.textContent = 'Vue 3D indisponible sur cet appareil';
      return;
    }
    status.textContent = 'Chargement de la vue 3D…';
    progress.hidden = false;
    try {
      viewerHost.hidden = false;
      viewer = await mountViewer(viewerHost, {
        modelUrl: config!.modelUrl,
        lacquerMaterial: config!.lacquerMaterial,
        colorway: config!.colorways[current].linear,
        reducedMotion,
        onProgress: (r) => progress.style.setProperty('--p', String(r)),
      });
      stage!.dataset.mode = '3d';
      status.textContent = 'Vue 3D · 360°';
      controls.hidden = false;
      hint.hidden = false;
      setTimeout(() => hint.classList.add('is-faded'), HINT_DELAY_MS);
    } catch {
      viewerHost.hidden = true;
      status.textContent = "La vue 3D n'a pas pu être chargée. Photographie affichée.";
    } finally {
      progress.hidden = true;
    }
  }

  // ---------------------------------------------------------------- events
  inputs.forEach((input) =>
    input.addEventListener('change', () => isColorway(input.value) && applyColorway(input.value)),
  );

  document.querySelectorAll<HTMLElement>('[data-pick-colorway]').forEach((el) =>
    el.addEventListener('click', () => {
      const id = el.dataset.pickColorway;
      if (!isColorway(id)) return;
      applyColorway(id);
      stage.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      inputs.find((i) => i.value === id)?.focus({ preventScroll: true });
    }),
  );

  const addToCart = () => {
    const cart = loadCart();
    if (!canAddMore(cart, current)) return;
    const persisted = saveCart(addItem(cart, current));
    updateAddButton();
    openCartDrawer(
      persisted
        ? `TENSIL ${config.colorways[current].name} a été ajoutée à votre panier.`
        : "Ajoutée, mais votre navigateur bloque l'enregistrement : le panier sera perdu en quittant la page.",
    );
  };
  addBtn.addEventListener('click', addToCart);
  barBtn?.addEventListener('click', addToCart);

  // Mobile buy bar: shown once the main button is above the viewport. A scroll listener is used
  // rather than IntersectionObserver, which misses jumps that never cross the viewport (anchors).
  if (bar) {
    let queued = false;
    const syncBar = () => {
      queued = false;
      bar.hidden = addBtn.getBoundingClientRect().bottom > 0;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(syncBar);
      },
      { passive: true },
    );
    syncBar();
  }

  controls.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn || !viewer) return;
    if (btn.dataset.rotate) viewer.rotate(Number(btn.dataset.rotate));
    if ('reset' in btn.dataset) viewer.reset();
  });

  viewerHost.addEventListener('keydown', (e) => {
    if (!viewer) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => viewer!.rotate(-KEY_STEP_DEG),
      ArrowRight: () => viewer!.rotate(KEY_STEP_DEG),
      ArrowUp: () => viewer!.rotate(0, -KEY_STEP_DEG / 2),
      ArrowDown: () => viewer!.rotate(0, KEY_STEP_DEG / 2),
      '+': () => viewer!.zoom(0.9),
      '=': () => viewer!.zoom(0.9),
      '-': () => viewer!.zoom(1.1),
      Home: () => viewer!.reset(),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  });

  window.addEventListener('tensil:cart', updateAddButton);
  loadBtn.addEventListener('click', () => void startViewer());

  // ---------------------------------------------------------------- start
  const fromUrl = colorwayFromUrl(config);
  if (fromUrl && fromUrl !== current) applyColorway(fromUrl, { updateUrl: false });
  updateAddButton();

  // The 3D view (three.js + GLB, the heaviest part of the page) loads on demand: the button,
  // or the first sign of intent (pointer, touch, keyboard, focus on the stage). The studio
  // photo stays the first paint and the page stays responsive while nobody interacts.
  loadBtn.hidden = false;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData) {
    status.textContent = 'Économiseur de données actif';
    return;
  }
  const INTENT_EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel'] as const;
  const onIntent = () => {
    INTENT_EVENTS.forEach((type) => window.removeEventListener(type, onIntent));
    void startViewer();
  };
  INTENT_EVENTS.forEach((type) => window.addEventListener(type, onIntent, { once: true, passive: true }));
  stage.addEventListener('focusin', onIntent, { once: true });
}
