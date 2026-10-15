import raw from './colorways.json';
import { linearToHex } from '../lib/color';

/** Single source for colours: written by tools/blender/export_store.py from the Blender materials. */
export const LACQUER_MATERIAL = raw.material;

export const COLORWAY_IDS = ['graphite', 'sage', 'oxide', 'cream'] as const;
export type ColorwayId = (typeof COLORWAY_IDS)[number];

const LABELS: Record<ColorwayId, { name: string; slug: string; note: string }> = {
  graphite: { name: 'Graphite', slug: 'graphite', note: 'Laque presque noire, rotules laiton.' },
  sage: { name: 'Sauge', slug: 'sauge', note: 'Vert gris doux, inspiré des ateliers.' },
  oxide: { name: 'Oxyde', slug: 'oxyde', note: 'Rouge brique chaud, le plus affirmé.' },
  cream: { name: 'Crème', slug: 'creme', note: 'Blanc cassé, le plus discret.' },
};

export interface Colorway {
  id: ColorwayId;
  name: string;
  slug: string;
  note: string;
  linear: [number, number, number];
  hex: string;
}

export const COLORWAYS: Colorway[] = COLORWAY_IDS.map((id) => {
  const linear = raw.colorways[id] as [number, number, number];
  return { id, ...LABELS[id], linear, hex: linearToHex(linear) };
});

export const DEFAULT_COLORWAY: ColorwayId = 'graphite';

export function colorwayFromSlug(slug: string | null): ColorwayId | null {
  return COLORWAYS.find((c) => c.slug === slug || c.id === slug)?.id ?? null;
}

export function getColorway(id: ColorwayId): Colorway {
  return COLORWAYS.find((c) => c.id === id) as Colorway;
}

/** Fictitious commercial data — clearly labelled as such on every page. */
export const PRODUCT = {
  name: 'TENSIL',
  tagline: 'Lampe de bureau articulée',
  price: 249,
  currency: 'EUR',
  maxQty: 5,
  shipping: 0,
  dimensions: [
    ['Hauteur en position de travail', '43 cm'],
    ['Portée du bras', '60 cm (2 × 30 cm)'],
    ['Diamètre de la base', '22 cm'],
    ['Abat-jour', 'Ø 15 cm'],
  ],
  materials: [
    ['Bras, base, abat-jour', 'Acier laqué, vernis brillant'],
    ['Rotules et bague', 'Laiton brossé'],
    ['Ressorts', 'Acier poli, 2 par segment'],
    ['Câble', 'Caoutchouc, sortie arrière'],
  ],
} as const;

export const formatPrice = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: PRODUCT.currency, maximumFractionDigits: 0 }).format(value);
