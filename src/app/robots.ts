import type { MetadataRoute } from 'next'
import { SITE_CONFIG, IS_CANONICAL_DOMAIN } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  // Pre-launch (and every preview deployment) must stay out of search results.
  // If the vercel.app build gets indexed it competes with the real domain as
  // duplicate content once DNS is cut over, and Google can take weeks to drop
  // it. This flips to the normal rules automatically the moment
  // NEXT_PUBLIC_SITE_URL becomes the canonical domain — see IS_CANONICAL_DOMAIN.
  if (!IS_CANONICAL_DOMAIN) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/studio/', '/checkout', '/api/'],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  }
}
