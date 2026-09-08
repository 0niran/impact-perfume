import type { Metadata } from 'next'

/**
 * The site-wide share card, as an explicit metadata value.
 *
 * Next's opengraph-image file convention does NOT reach a route that declares
 * its own `openGraph` object: the child's object replaces the parent's rather
 * than merging into it, and the generated image is only attached where no
 * conflicting config exists. So every page with an `openGraph` block of its own
 * silently shipped with no og:image at all, and shares from it rendered blank.
 *
 * Spelling the image out is what makes that impossible to reintroduce: a page
 * either has its own generated card (see app/no/[number]/opengraph-image.tsx)
 * or spreads this in.
 */
export const DEFAULT_OG_IMAGES: NonNullable<NonNullable<Metadata['openGraph']>['images']> = [
  { url: '/opengraph-image', width: 1200, height: 630, alt: 'Impact Perfumes & Oils' },
]
