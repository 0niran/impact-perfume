import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/lib/config'

const { url } = SITE_CONFIG

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url, priority: 1, changeFrequency: 'weekly' },
  { url: `${url}/shop`, priority: 0.9, changeFrequency: 'weekly' },
  { url: `${url}/oils`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/home`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/gifts`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/signature`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${url}/quiz`, priority: 0.8, changeFrequency: 'monthly' },
  { url: `${url}/b2b`, priority: 0.7, changeFrequency: 'monthly' },
  { url: `${url}/house-story`, priority: 0.6, changeFrequency: 'monthly' },
  { url: `${url}/journal`, priority: 0.7, changeFrequency: 'weekly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const pdpPages: MetadataRoute.Sitemap = Array.from({ length: 50 }, (_, i) => ({
    url: `${url}/no/${i + 1}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
    lastModified: new Date(),
  }))

  return [...STATIC_PAGES, ...pdpPages]
}
