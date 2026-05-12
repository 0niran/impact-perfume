import { NextRequest, NextResponse } from 'next/server'
import { OILS, CAR_DIFFUSERS, HOME_DIFFUSERS } from '@/data/products'
import { getAllNumberSeriesProducts } from '@/lib/medusa'
import { FALLBACK_COLOR } from '@/lib/constants'

export interface SearchResult {
  handle: string
  title: string
  descriptor: string
  signatureColor: string
  category: 'Number Series' | 'Oils' | 'Car Diffusers' | 'Home Diffusers'
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

function staticResults(): SearchResult[] {
  const oils: SearchResult[] = OILS.map((o) => ({
    handle: o.handle,
    title: o.title,
    descriptor: o.descriptor,
    signatureColor: o.signatureColor,
    category: 'Oils',
    href: '/oils',
  }))

  const car: SearchResult[] = CAR_DIFFUSERS.map((d) => ({
    handle: d.handle,
    title: d.title,
    descriptor: d.descriptor,
    signatureColor: d.signatureColor,
    category: 'Car Diffusers',
    href: '/home',
  }))

  const home: SearchResult[] = HOME_DIFFUSERS.map((d) => ({
    handle: d.handle,
    title: d.title,
    descriptor: d.descriptor,
    signatureColor: d.signatureColor,
    category: 'Home Diffusers',
    href: '/home',
  }))

  return [...oils, ...car, ...home]
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
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const [numberSeries, staticAll] = await Promise.all([
    getNumberSeries(),
    Promise.resolve(staticResults()),
  ])

  const all = [...numberSeries, ...staticAll]

  const scored = all
    .map((r) => ({ ...r, _score: score(r, q) }))
    .filter((r) => r._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8)
    .map(({ _score: _, ...r }) => r)

  return NextResponse.json({ results: scored })
}
