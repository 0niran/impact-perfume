import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/lib/config'
import {
  getAllNumberSeriesProducts,
  getProductsByCategory,
  getSignatureProducts,
  toEnrichment,
} from '@/lib/medusa'

const { url } = SITE_CONFIG

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url, priority: 1, changeFrequency: 'weekly' },
  { url: `${url}/no-series`, priority: 0.9, changeFrequency: 'weekly' },
  { url: `${url}/oils`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/home`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/home-diffusers`, priority: 0.7, changeFrequency: 'weekly' },
  { url: `${url}/car-diffusers`, priority: 0.7, changeFrequency: 'weekly' },
  { url: `${url}/scent-candles`, priority: 0.7, changeFrequency: 'weekly' },
  { url: `${url}/scenting-machines`, priority: 0.7, changeFrequency: 'weekly' },
  { url: `${url}/gifts`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/number-discovery-set`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/signature-discovery-set`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/signature`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/quiz`, priority: 0.8, changeFrequency: 'monthly' },
  { url: `${url}/b2b`, priority: 0.7, changeFrequency: 'monthly' },
  { url: `${url}/bespoke`, priority: 0.7, changeFrequency: 'monthly' },
  { url: `${url}/house-story`, priority: 0.6, changeFrequency: 'monthly' },
]

/**
 * Re-read the catalogue hourly rather than on every crawl.
 *
 * If Medusa is unreachable when this regenerates, the catalogue reads below
 * degrade to empty and the file falls back to the static pages alone. That is
 * the safe failure — a short sitemap costs far less than one advertising URLs
 * that 404 — and the next revalidation repairs it without a deploy.
 */
export const revalidate = 3600

/**
 * Sitemap built from the live catalogue.
 *
 * It used to emit /no/1 through /no/50 unconditionally. Numbers that do not
 * exist 404, and a sitemap full of 404s is a quality signal working against
 * the site: it spends crawl budget on nothing and teaches the crawler the file
 * is unreliable. It also listed no oils, no signature scents and no bespoke
 * page at all, so entire branches of the catalogue were invisible.
 *
 * Every entry below is now a product the store actually returns.
 *
 * There is deliberately no lastModified. Setting it to `new Date()` — as this
 * did — claims every URL changed at every build, which is false for almost all
 * of them, and a freshness signal that is always "now" is one a crawler learns
 * to discount. Medusa exposes no per-product updated_at on the store read, so
 * the honest move is to omit the field rather than fabricate it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [numbers, oils, signature] = await Promise.all([
    getAllNumberSeriesProducts(200).catch(() => []),
    getProductsByCategory('oils', 200).catch(() => []),
    getSignatureProducts().catch(() => []),
  ])

  const numberPages: MetadataRoute.Sitemap = numbers
    .map((p) => toEnrichment(p))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => ({
      url: `${url}/no/${e.number}`,
      priority: 0.8,
      changeFrequency: 'monthly' as const,
    }))

  const oilPages: MetadataRoute.Sitemap = oils
    .map((p) => toEnrichment(p))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => ({
      url: `${url}/oil/${e.number}`,
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    }))

  const signaturePages: MetadataRoute.Sitemap = signature
    .filter((p) => Boolean(p.handle))
    .map((p) => ({
      url: `${url}/signature/${p.handle}`,
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    }))

  // De-duplicate defensively: a product that sits in more than one category
  // would otherwise appear twice, which is a validation warning.
  const seen = new Set<string>()
  return [...STATIC_PAGES, ...numberPages, ...oilPages, ...signaturePages].filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
