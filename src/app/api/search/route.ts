import { NextRequest, NextResponse } from 'next/server'
import type { MedusaProduct } from '@/types'
import { getAllNumberSeriesProducts, getProductsByCategory } from '@/lib/medusa'
import { FALLBACK_COLOR } from '@/lib/constants'
import { rateLimit } from '@/lib/rateLimit'

export interface SearchResult {
  handle: string
  title: string
  descriptor: string
  signatureColor: string
  category: 'Number Series' | 'Perfume Oils' | 'Car Diffusers' | 'Home Diffusers' | 'Scent Candles' | 'Scenting Machines'
  href: string
  number?: number
}

async function getNumberSeries(): Promise<SearchResult[]> {
  try {
    const products = await getAllNumberSeriesProducts(100)
    return products.map((p) => {
      const num = parseInt(p.handle.replace('no-', ''), 10)
      const m = p.metadata ?? {}
      return {
        handle: p.handle,
        title: p.title,
        descriptor: m.descriptor ?? p.subtitle ?? '',
        signatureColor: m.signature_color ?? FALLBACK_COLOR,
        category: 'Number Series' as const,
        href: `/no/${num}`,
        number: num,
      }
    })
  } catch {
    return []
  }
}

/** Live category search: maps a Medusa category to search results. */
async function categoryResults(
  categoryHandle: string,
  category: SearchResult['category'],
  href: (p: MedusaProduct) => string
): Promise<SearchResult[]> {
  try {
    const products = await getProductsByCategory(categoryHandle, 100)
    return products.map((p) => {
      const m = p.metadata ?? {}
      return {
        handle: p.handle,
        title: p.title,
        descriptor: m.descriptor ?? p.subtitle ?? '',
        signatureColor: m.signature_color ?? FALLBACK_COLOR,
        category,
        href: href(p),
      }
    })
  } catch {
    return []
  }
}

function score(result: SearchResult, q: string): number {
  const lq = q.toLowerCase()
  const titleL = result.title.toLowerCase()
  const descL = result.descriptor.toLowerCase()
  const catL = result.category.toLowerCase()

  if (titleL === lq) return 100
  if (titleL.startsWith(lq)) return 80
  if (titleL.includes(lq)) return 60
  if (descL.includes(lq)) return 40
  if (catL.includes(lq)) return 20
  return 0
}

export async function GET(req: NextRequest) {
  const limit = await rateLimit(req, 'search', { limit: 30, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const groups = await Promise.all([
    getNumberSeries(),
    categoryResults('oils', 'Perfume Oils', (p) => `/oil/${p.handle.replace('oil-no-', '')}`),
    categoryResults('scent-candles', 'Scent Candles', (p) => `/products/${p.handle}`),
    categoryResults('home-diffusers', 'Home Diffusers', (p) => `/products/${p.handle}`),
    categoryResults('car-diffusers', 'Car Diffusers', (p) => `/products/${p.handle}`),
    categoryResults('scenting-machines', 'Scenting Machines', (p) => `/products/${p.handle}`),
  ])

  const all = groups.flat()

  const scored = all
    .map((r) => ({ ...r, _score: score(r, q) }))
    .filter((r) => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8)
    .map(({ _score: _, ...r }) => r)

  return NextResponse.json({ results: scored })
}
