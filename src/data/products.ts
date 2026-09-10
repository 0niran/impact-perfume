/**
 * The last static product data.
 *
 * This file once held hardcoded arrays for every category, with a note to
 * replace them with API calls once Medusa had the products. That happened, but
 * the arrays stayed — seven of them, unreachable, describing a catalogue that
 * had moved on.
 *
 * What remains is a genuine fallback: the Signature Discovery Set page lists
 * what is in the box, and if the Signature category returns nothing it still
 * needs to name the scents rather than show an empty box.
 */

/**
 * Static placeholders for Signature Scents that haven't been added to Medusa
 * yet. The shop page renders these alongside any Medusa-backed signature
 * products so the catalogue feels complete during onboarding. Once a product
 * appears in Medusa with the same handle, the live entry takes over.
 */
export interface SignaturePlaceholder {
  handle: string
  title: string
  subtitle?: string
  descriptor?: string
  imageUrl?: string
  signatureColor?: string
}

export const SIGNATURE_PLACEHOLDERS: SignaturePlaceholder[] = [
  {
    handle: 'lavure',
    title: 'Lavure',
    subtitle: '100ml · Eau de Parfum',
    descriptor: 'Powder · Iris · Musk',
    signatureColor: '#A88E70',
  },
  {
    handle: 'oud-osmosis',
    title: 'OUD Osmosis',
    subtitle: '100ml · Eau de Parfum',
    descriptor: 'Oud · Resin · Amber',
    imageUrl: '/images/OUD Osmosis Unlimited.png',
    signatureColor: '#3A2418',
  },
  {
    handle: 'solid-oud-intense',
    title: 'Solid OUD Intense',
    subtitle: '100ml · Eau de Parfum',
    descriptor: 'Oud · Smoke · Leather',
    imageUrl: '/images/Solid Oud.png',
    signatureColor: '#1F1410',
  },
]

