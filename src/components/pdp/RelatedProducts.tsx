import Link from 'next/link'
import Image from 'next/image'
import {
  getMedusaProduct,
  getAllNumberSeriesProducts,
  toEnrichment,
  getPrice,
  getProductImage,
} from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import { formatPrice } from '@/lib/format'
import { FALLBACK_COLOR } from '@/lib/constants'

const BOTTLE_FALLBACK = '/images/no_series.png'

interface RelatedProductsProps {
  currentNumber: number
}

interface RelatedItem {
  number: number
  descriptor: string
  scentFamily?: string
  signatureColor: string
  tagline?: string
  priceMinor: number
  currency: string
  imageUrl: string | null
}

export default async function RelatedProducts({ currentNumber }: RelatedProductsProps) {
  const region = getServerRegion()

  // Look up the current product to find its scent family.
  const current = await getMedusaProduct(`no-${currentNumber}`, region.medusaRegionId)
  const currentFamily = (current?.metadata as { scent_family?: string } | undefined)?.scent_family

  // Fetch the whole catalogue once so we can rank by family then by distance.
  const all = await getAllNumberSeriesProducts(100, region.medusaRegionId)

  const candidates: RelatedItem[] = []
  for (const p of all) {
    const enrichment = toEnrichment(p, region.currency)
    if (!enrichment || enrichment.number === currentNumber) continue
    const price = getPrice(p, region.currency)
    candidates.push({
      number: enrichment.number,
      descriptor: enrichment.descriptor,
      scentFamily: enrichment.scentFamily,
      signatureColor: enrichment.signatureColor ?? FALLBACK_COLOR,
      tagline: enrichment.tagline,
      priceMinor: price.amount,
      currency: price.currency,
      imageUrl: getProductImage(p),
    })
  }

  // Primary pick: same scent family. Secondary pick: numerical neighbours.
  // Sort same-family by closeness to currentNumber so they feel curated.
  const sameFamily = currentFamily
    ? candidates
        .filter((c) => c.scentFamily === currentFamily)
        .sort((a, b) => Math.abs(a.number - currentNumber) - Math.abs(b.number - currentNumber))
    : []

  const used = new Set(sameFamily.slice(0, 3).map((c) => c.number))
  const fillers = candidates
    .filter((c) => !used.has(c.number))
    .sort((a, b) => Math.abs(a.number - currentNumber) - Math.abs(b.number - currentNumber))

  const items = [...sameFamily.slice(0, 3), ...fillers].slice(0, 3)

  if (items.length === 0) return null

  const headline = currentFamily && sameFamily.length >= 3
    ? `More in ${currentFamily}`
    : 'Others in the series'

  return (
    <section className="border-t border-stone/20 bg-ink px-6 py-16 md:px-10 lg:px-16">
      <p className="text-label uppercase tracking-[0.1em] text-stone mb-8">
        {headline}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.number}
            href={`/no/${item.number}`}
            className="group flex flex-col overflow-hidden border border-stone/20 hover:border-stone/50 transition-colors duration-200"
          >
            <div className="relative flex h-56 items-center justify-center overflow-hidden bg-ink">
              <div
                className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
                style={{
                  background: `radial-gradient(ellipse at center, ${item.signatureColor}33 0%, transparent 65%)`,
                }}
                aria-hidden="true"
              />

              <div className="relative z-10 w-[45%] h-[80%]">
                <Image
                  src={item.imageUrl ?? BOTTLE_FALLBACK}
                  alt={`Impact No. ${item.number}`}
                  fill
                  sizes="(min-width: 640px) 15vw, 40vw"
                  className="object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 px-5 py-4">
              <p className="text-label uppercase tracking-[0.08em] text-stone">
                No. {item.number}
              </p>
              <p className="font-display text-h3 leading-none text-bone">
                {item.descriptor}
              </p>
              {item.tagline && (
                <p className="text-small text-stone line-clamp-1">{item.tagline}</p>
              )}
              <p className="mt-1 text-small text-accent">
                {item.priceMinor > 0 ? formatPrice(item.priceMinor, item.currency) : 'Price on request'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
