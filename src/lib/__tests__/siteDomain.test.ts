import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Search visibility is derived from NEXT_PUBLIC_SITE_URL so the domain cutover
 * flips it automatically. That makes it exactly the kind of thing that breaks
 * silently, so pin the behaviour: pre-launch and preview builds must never be
 * indexable, and the real domain must be.
 *
 * IS_CANONICAL_DOMAIN is computed once at module load, so each case needs a
 * fresh module registry.
 */
async function loadWithSiteUrl(url: string | undefined) {
  vi.resetModules()
  if (url === undefined) vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
  else vi.stubEnv('NEXT_PUBLIC_SITE_URL', url)
  const config = await import('@/lib/config')
  const robots = (await import('@/app/robots')).default
  return { config, robots }
}

describe('canonical-domain detection', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ['https://impactperfumes.com', true],
    ['https://www.impactperfumes.com', true],
    ['https://impactperfumes.com/', true],
    // Pre-launch and preview hosts
    ['https://impact-perfume.vercel.app', false],
    ['https://impact-perfume-git-branch.vercel.app', false],
    ['http://localhost:3000', false],
    // Look-alikes must not count as canonical
    ['https://impactperfumes.com.evil.test', false],
    ['https://notimpactperfumes.com', false],
    // Unparseable falls back to "not canonical" (safe default)
    ['not-a-url', false],
  ])('%s -> canonical=%s', async (url, expected) => {
    const { config } = await loadWithSiteUrl(url)
    expect(config.IS_CANONICAL_DOMAIN).toBe(expected)
  })
})

describe('robots.txt', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllEnvs())

  it('blocks all crawlers on a pre-launch/preview host', async () => {
    const { robots } = await loadWithSiteUrl('https://impact-perfume.vercel.app')
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    expect(rules[0]).toMatchObject({ userAgent: '*', disallow: '/' })
    // No sitemap should be advertised for a site that must not be indexed.
    expect(result.sitemap).toBeUndefined()
  })

  it('allows crawling and advertises the sitemap on the canonical domain', async () => {
    const { robots } = await loadWithSiteUrl('https://impactperfumes.com')
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    expect(rules[0]).toMatchObject({ userAgent: '*', allow: '/' })
    expect(rules[0].disallow).toEqual(['/studio/', '/checkout', '/api/'])
    expect(result.sitemap).toBe('https://impactperfumes.com/sitemap.xml')
  })
})
