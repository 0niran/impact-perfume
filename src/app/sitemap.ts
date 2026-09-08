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
  { url: `${url}/privacy`, priority: 0.3, changeFrequency: 'yearly' },
  { url: `${url}/terms`, priority: 0.3, changeFrequency: 'yearly' },
]

/**
 * Rendered per request, not prerendered at build.
 *
 * With the default behaviour Next bakes the result into
 * .next/server/app/sitemap.xml.body during `next build`. If the Medusa read is
 * slow or fails in that moment — a cold Railway container during a deploy is
 * enough — the empty result is frozen into the deployment and served to every
 * crawler until the revalidation window elapses. That was observed: the same
 * code produced 124, then 66, then 16 URLs across three consecutive builds.
 *
 * Per-request generation makes a transient failure last one request instead of
 * an hour, and the underlying catalogue reads are already behind a 120s data
 * cache, so this costs a crawl no real work.
 */
export const dynamic = 'force-dynamic'

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
  const [numbers, oils, signature, homeAndGifts] = await Promise.all([
    getAllNumberSeriesProducts(200).catch(() => []),
    getProductsByCategory('oils', 200).catch(() => []),
    getSignatureProducts().catch(() => []),
    // Scent candles, home + car diffusers and scenting machines all render at
    // /products/[handle] and were absent from the sitemap entirely.
    Promise.all(
      ['scent-candles', 'home-diffusers', 'car-diffusers', 'scenting-machines'].map((c) =>
        getProductsByCategory(c, 100).catch(() => [])
      )
    ).then((groups) => groups.flat()),
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

  const homePages: MetadataRoute.Sitemap = homeAndGifts
    .filter((p) => Boolean(p.handle))
    .map((p) => ({
      url: `${url}/products/${p.handle}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    }))

  // De-duplicate defensively: a product that sits in more than one category
  // would otherwise appear twice, which is a validation warning.
  const seen = new Set<string>()
  return [...STATIC_PAGES, ...numberPages, ...oilPages, ...signaturePages, ...homePages].filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}
