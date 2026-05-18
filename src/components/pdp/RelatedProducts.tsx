import Link from 'next/link'
import Image from 'next/image'
import { getMedusaProduct, toEnrichment, getNGNPrice, getProductImage } from '@/lib/medusa'
import { formatNaira } from '@/lib/format'
import { FALLBACK_COLOR } from '@/lib/constants'

const BOTTLE_FALLBACK = '/images/no_series.png'

interface RelatedProductsProps {
  currentNumber: number
}

interface RelatedItem {
  number: number
  descriptor: string
  signatureColor: string
  tagline?: string
  priceKobo: number
  imageUrl: string | null
}

async function fetchRelated(numbers: number[]): Promise<RelatedItem[]> {
  const results = await Promise.allSettled(
    numbers.map((n) => getMedusaProduct(`no-${n}`))
  )
  const items: RelatedItem[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const product = r.value
    const enrichment = toEnrichment(product)
    if (!enrichment) continue
    items.push({
      number: enrichment.number,
      descriptor: enrichment.descriptor,
      signatureColor: enrichment.signatureColor ?? FALLBACK_COLOR,
      tagline: enrichment.tagline,
      priceKobo: getNGNPrice(product),
      imageUrl: getProductImage(product),
    })
  }
  return items
}

export default async function RelatedProducts({ currentNumber }: RelatedProductsProps) {
  const candidates = [
    currentNumber - 2,
    currentNumber - 1,
    currentNumber + 1,
    currentNumber + 2,
  ].filter((n) => n >= 1 && n <= 100 && n !== currentNumber)

  const neighbours = candidates.slice(0, 3)
  const items = await fetchRelated(neighbours)

  if (items.length === 0) return null

  return (
    <section className="border-t border-stone/20 bg-ink px-6 py-16 md:px-10 lg:px-16">
      <p className="text-label uppercase tracking-[0.1em] text-stone mb-8">
        Others in the series
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.number}
            href={`/no/${item.number}`}
            className="group flex flex-col overflow-hidden border border-stone/20 hover:border-stone/50 transition-colors duration-200"
          >
            {/* Product on dark surface with subtle signature glow */}
            <div className="relative flex h-56 items-center justify-center overflow-hidden bg-ink">
              <div
                className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
                style={{
                  background: `radial-gradient(ellipse at center, ${item.signatureColor}33 0%, transparent 65%)`,
                }}
                aria-hidden="true"
              />

              {/* Bottle image */}
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

            {/* Info */}
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
                {item.priceKobo > 0 ? formatNaira(item.priceKobo) : 'Price on request'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
