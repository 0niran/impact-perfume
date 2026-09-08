import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guards a real regression.
 *
 * Next's opengraph-image file convention does not reach a route that declares
 * its own `openGraph` object — the child's object replaces the parent's rather
 * than merging. When the hand-written `/og-default.jpg` pointers were removed
 * in favour of the generated card, thirteen routes were left with no og:image
 * at all, and every share from them rendered blank.
 *
 * This walks the route tree rather than asserting a hardcoded list, so a page
 * added later is covered the day it lands.
 */
const APP = path.join(process.cwd(), 'src/app')

function pageFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Not customer-facing routes.
      if (entry.name === 'api' || entry.name === 'studio') continue
      out.push(...pageFiles(full))
    } else if (entry.name === 'page.tsx') {
      out.push(full)
    }
  }
  return out
}

/** A route with its own opengraph-image.tsx generates its card and needs nothing. */
function hasOwnGeneratedCard(pageFile: string): boolean {
  return fs.existsSync(path.join(path.dirname(pageFile), 'opengraph-image.tsx'))
}

describe('og:image coverage', () => {
  const pages = pageFiles(APP)

  it('finds the route tree', () => {
    expect(pages.length).toBeGreaterThan(10)
  })

  it.each(pages.map((p) => [path.relative(APP, p), p] as const))(
    '%s declares an og:image if it declares openGraph',
    (_label, file) => {
      const src = fs.readFileSync(file, 'utf8')
      if (!src.includes('openGraph:')) return // inherits the root card, which is fine
      if (hasOwnGeneratedCard(file)) return
      expect(
        src.includes('images:'),
        'declares openGraph without images, so the generated card will not attach — ' +
          'spread DEFAULT_OG_IMAGES from @/lib/seo'
      ).toBe(true)
    }
  )

  it('no page still points at the deleted og-default.jpg', () => {
    for (const file of pages) {
      expect(fs.readFileSync(file, 'utf8')).not.toContain('og-default.jpg')
    }
  })
})
