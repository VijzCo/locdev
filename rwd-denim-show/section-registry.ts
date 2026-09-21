/**
 * RW DESIGN — SECTION REGISTRY
 * components/sections/registry.ts
 *
 * The contract between the CMS page builder and the rendered site.
 * Admins compose pages from these types; adding a NEW type is a dev task
 * (see Blueprint assumption A7). A section type missing from this registry
 * renders nothing publicly and shows a recoverable notice in Admin — a
 * deployment can never break a live page.
 */

import { z } from 'zod';
import type { ComponentType } from 'react';

/* ── Shared primitives ───────────────────────────────────────── */

/** Every human-facing string is a locale map from day one (assumption A4). */
export const localeString = z.object({ en: z.string() }).catchall(z.string());
export type LocaleString = z.infer<typeof localeString>;

export const mediaRef = z.object({
  mediaId: z.string(),            // → /media/{contentHash}
  alt: localeString.optional(),   // required for images at upload time
  focal: z.tuple([z.number(), z.number()]).default([0.5, 0.5]),
});

export const ctaSchema = z.object({
  label: localeString,
  href: z.string(),
  variant: z.enum(['primary', 'ghost']).default('primary'),
});

/** Present on every section instance, independent of type. */
export const sectionBase = z.object({
  id: z.string(),
  type: z.string(),
  order: z.number(),              // sparse float ordering — a drag writes ONE doc
  visible: z.boolean().default(true),
  anchor: z.string().optional(),  // in-page nav target
  theme: z.enum(['default', 'inset', 'raised']).default('default'),
});

/* ── Section prop schemas ────────────────────────────────────── */

const heroCinematic = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).min(1).max(3),
  lede: localeString.optional(),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
  scene3d: z.enum(['fabric', 'thread', 'garment', 'none']).default('fabric'),
  poster: mediaRef,               // shown first, always — LCP never waits on WebGL
  fallbackVideo: mediaRef.optional(),
});

const statementEditorial = z.object({
  eyebrow: localeString.optional(),
  quoteLines: z.array(localeString).min(1).max(3),
  body: localeString.optional(),
  media: mediaRef.optional(),
  mediaSide: z.enum(['left', 'right']).default('right'),
  cta: ctaSchema.optional(),
});

const navEditorial = z.object({
  tiles: z.array(z.object({
    title: localeString,
    description: localeString,
    href: z.string(),
  })).min(2).max(4),
});

const collectionsFeatured = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  collectionIds: z.array(z.string()).min(1).max(5),
  cta: ctaSchema.optional(),
});

const denimTeaser = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  lede: localeString.optional(),
  /** Empty = auto-fill with the 6 most recently published fabrics. */
  fabricIds: z.array(z.string()).max(6).default([]),
  cta: ctaSchema.optional(),
});

const productsShowcase = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  source: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('manual'), productIds: z.array(z.string()).max(12) }),
    z.object({ mode: z.literal('collection'), collectionId: z.string(), limit: z.number().max(12).default(6) }),
  ]),
  cta: ctaSchema.optional(),
});

const capabilitiesChain = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  capabilityIds: z.array(z.string()).min(2).max(12),
  layout: z.enum(['pinned', 'list']).default('pinned'), // 'pinned' auto-degrades to 'list' on mobile / reduced motion
});

const sustainabilityMetrics = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  lede: localeString.optional(),
  metrics: z.array(z.object({
    value: z.string(),            // string, not number — "—" is a valid unpublished state
    unit: z.string().default('%'),
    label: localeString,
    placeholder: z.boolean().default(true),  // drives the dashboard "unreplaced data" warning
  })).max(4),
});

const facilityCinematic = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  media: mediaRef,
  video: mediaRef.optional(),     // never autoplays on saveData / slow connections
  stats: z.array(z.object({
    value: z.string(),
    label: localeString,
    placeholder: z.boolean().default(true),
  })).max(4),
});

const catalogueFeatured = z.object({
  eyebrow: localeString.optional(),
  headlineLines: z.array(localeString).max(2),
  catalogueIds: z.array(z.string()).min(1).max(6),
});

const ctaClosing = z.object({
  headlineLines: z.array(localeString).max(2),
  cta: ctaSchema,
  /** When the visitor has a non-empty selection, copy swaps to this.
   *  Highest-value personalisation on the site. */
  selectionVariant: z.object({
    note: localeString,           // "You've selected {count} styles. Send them to us."
    cta: ctaSchema,
  }).optional(),
});

/* ── The registry ────────────────────────────────────────────── */

export interface SectionDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Shown in the Admin section picker — buyer language, not schema language. */
  label: string;
  group: 'Opening' | 'Story' | 'Product' | 'Proof' | 'Closing';
  schema: S;
  defaults: z.input<S>;
  /** Lazy so the page builder never pulls the public render tree into admin JS. */
  component: () => Promise<{ default: ComponentType<{ props: z.infer<S>; index: number }> }>;
  /** true = ships a client bundle; used by the perf budget check in CI. */
  interactive: boolean;
  maxPerPage?: number;
}

export const SECTION_REGISTRY = {
  'hero.cinematic': {
    label: 'Cinematic hero',
    group: 'Opening',
    schema: heroCinematic,
    defaults: { headlineLines: [{ en: 'Denim' }, { en: 'Reimagined.' }], scene3d: 'fabric',
                primaryCta: { label: { en: 'Enter the showroom' }, href: '#statement', variant: 'primary' },
                poster: { mediaId: '', focal: [0.5, 0.5] } },
    component: () => import('./HeroCinematic'),
    interactive: true,
    maxPerPage: 1,
  },
  'statement.editorial': {
    label: 'Brand statement',
    group: 'Story',
    schema: statementEditorial,
    defaults: { quoteLines: [{ en: 'Built around denim.' }, { en: 'Designed around possibility.' }], mediaSide: 'right' },
    component: () => import('./StatementEditorial'),
    interactive: false,
  },
  'nav.editorial': {
    label: 'Explore tiles',
    group: 'Story',
    schema: navEditorial,
    defaults: { tiles: [] },
    component: () => import('./NavEditorial'),
    interactive: false,
  },
  'collections.featured': {
    label: 'Featured collections',
    group: 'Product',
    schema: collectionsFeatured,
    defaults: { headlineLines: [{ en: 'Season' }, { en: 'Development' }], collectionIds: [] },
    component: () => import('./CollectionsFeatured'),
    interactive: true,
  },
  'denim.teaser': {
    label: 'Denim library (shade cards)',
    group: 'Product',
    schema: denimTeaser,
    defaults: { headlineLines: [{ en: 'The Shade' }, { en: 'Card' }], fabricIds: [] },
    component: () => import('./DenimTeaser'),
    interactive: false,
  },
  'products.showcase': {
    label: 'Product showcase',
    group: 'Product',
    schema: productsShowcase,
    defaults: { headlineLines: [{ en: 'Styles on' }, { en: 'the Rail' }], source: { mode: 'manual', productIds: [] } },
    component: () => import('./ProductsShowcase'),
    interactive: true,
  },
  'capabilities.chain': {
    label: 'Capabilities chain',
    group: 'Proof',
    schema: capabilitiesChain,
    defaults: { headlineLines: [{ en: 'Idea to' }, { en: 'Delivery' }], capabilityIds: [], layout: 'pinned' },
    component: () => import('./CapabilitiesChain'),
    interactive: true,
  },
  'sustainability.metrics': {
    label: 'Sustainability metrics',
    group: 'Proof',
    schema: sustainabilityMetrics,
    defaults: { headlineLines: [{ en: 'Proof, not' }, { en: 'Posters' }],
                metrics: [{ value: '—', unit: '%', label: { en: 'Water reduction' }, placeholder: true }] },
    component: () => import('./SustainabilityMetrics'),
    interactive: false,
  },
  'facility.cinematic': {
    label: 'Manufacturing / facility',
    group: 'Proof',
    schema: facilityCinematic,
    defaults: { headlineLines: [{ en: 'Where ideas' }, { en: 'become garments.' }],
                media: { mediaId: '', focal: [0.5, 0.5] }, stats: [] },
    component: () => import('./FacilityCinematic'),
    interactive: false,
  },
  'catalogue.featured': {
    label: 'Catalogue downloads',
    group: 'Closing',
    schema: catalogueFeatured,
    defaults: { headlineLines: [{ en: 'Take it' }, { en: 'With You' }], catalogueIds: [] },
    component: () => import('./CatalogueFeatured'),
    interactive: true,
  },
  'cta.closing': {
    label: 'Closing call to action',
    group: 'Closing',
    schema: ctaClosing,
    defaults: { headlineLines: [{ en: "Let's create" }, { en: 'together.' }],
                cta: { label: { en: 'Start the conversation' }, href: '/contact', variant: 'primary' } },
    component: () => import('./CtaClosing'),
    interactive: true,
    maxPerPage: 1,
  },
} as const satisfies Record<string, SectionDefinition>;

export type SectionType = keyof typeof SECTION_REGISTRY;

/**
 * Validates a raw Firestore section doc. Returns null on unknown type or
 * malformed props — the page renders without it rather than throwing, and
 * the failure surfaces on the Admin dashboard. One bad document must never
 * take down a live page during show week.
 */
export function parseSection(raw: unknown) {
  const base = sectionBase.safeParse(raw);
  if (!base.success) return null;

  const def = SECTION_REGISTRY[base.data.type as SectionType];
  if (!def) return null;

  const props = def.schema.safeParse((raw as { props?: unknown }).props);
  if (!props.success) {
    console.error('[sections] invalid props', base.data.type, base.data.id, props.error.issues);
    return null;
  }
  return { ...base.data, props: props.data, definition: def };
}
