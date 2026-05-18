import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getMedusaProducts, getNGNPrice, toTileEnrichment } from '@/lib/medusa'
import ProductCard from './ProductCard'

const FALLBACK_CARDS = [
  { handle: 'no-5', title: 'Impact No. 5', number: 5, descriptor: 'Sweet Oud', signatureColor: '#1E64A4' },
  { handle: 'no-14', title: 'Impact No. 14', number: 14, descriptor: 'Citrus', signatureColor: '#1E78B8' },
  { handle: 'no-27', title: 'Impact No. 27', number: 27, descriptor: 'Fruity', signatureColor: '#C25719' },
]

export default async function FeaturedShelf() {
  const products = await getMedusaProducts(3)

  const cards =
    products.length > 0
      ? products.map((p) => {
          const enrich = toTileEnrichment(p)
          return {
            handle: p.handle,
            title: p.title,
            subtitle: p.subtitle,
            price: getNGNPrice(p),
            number: enrich?.number,
            descriptor: enrich?.descriptor,
            signatureColor: enrich?.signatureColor,
            signatureColorName: enrich?.signatureColorName,
            tagline: enrich?.tagline,
          }
        })
      : FALLBACK_CARDS

  return (
    <Section className="bg-ink">
      <Container>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">
              The Number Series
            </p>
            <h2 className="mt-2 font-display text-h1 text-bone">Start with a Number</h2>
          </div>
          <Link
            href="/shop"
            className="link-underline self-start text-small text-stone hover:text-bone md:self-auto"
          >
            View all 50
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <ProductCard key={card.handle} {...card} />
          ))}
        </div>
      </Container>
    </Section>
  )
}
