import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getProductsByCategory, toCategoryProduct } from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import { GIFTS, OCCASIONS, type GiftProduct } from '@/data/products'
import CategoryProductTile from '@/components/shop/CategoryProductTile'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Gifts & Discovery Sets',
  description:
    'Give the gift of scent. Discovery sets to find your Number, curated gift boxes for every occasion.',
  openGraph: {
    title: 'Gifts & Discovery Sets · Impact Perfumes',
    description: 'Curated fragrance gifts and discovery sets.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

function DiscoverySetCard({ gift }: { gift: GiftProduct }) {
  return (
    <Link
      href={gift.cta.href}
      className="group relative block overflow-hidden bg-ink focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div className="relative" style={{ aspectRatio: '4/5' }}>
        <Image
          src={gift.imageUrl}
          alt={gift.title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="border-t border-stone/15 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-body font-medium text-bone">{gift.title}</p>
          <p className="text-small text-stone tabular-nums shrink-0">{gift.subtitle}</p>
        </div>
        <p className="mt-1 text-small text-stone">{gift.description}</p>
      </div>
    </Link>
  )
}

export default async function GiftsPage() {
  const region = getServerRegion()
  const [discoveryMedusa, giftsMedusa] = await Promise.all([
    getProductsByCategory('discovery', 100, region.medusaRegionId),
    getProductsByCategory('gifts', 100, region.medusaRegionId),
  ])

  const discoveryLive = discoveryMedusa.map((p) => toCategoryProduct(p, region.currency))
  const giftsLive = giftsMedusa.map((p) => toCategoryProduct(p, region.currency))
  const showGiftSets = giftsLive.length > 0

  const subnav = [
    { id: 'discovery-sets', label: 'Discovery Set' },
    ...(showGiftSets ? [{ id: 'gift-sets', label: 'Gift Sets' }] : []),
    { id: 'occasions', label: 'By Occasion' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink text-bone py-16 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Gifts & Discovery Sets</p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none">
            Give a Scent.
            <br />
            Leave a Memory.
          </h1>
          <p className="mt-5 max-w-lg text-body text-stone">
            Every Impact fragrance arrives in signature packaging, ready to give.
          </p>
        </Container>
      </section>

      {/* Sticky sub-nav */}
      <nav
        aria-label="Sub-category navigation"
        className="sticky top-16 z-30 border-b border-stone/20 bg-ink/95 backdrop-blur-sm"
      >
        <Container className="flex items-center gap-2 overflow-x-auto py-3">
          {subnav.map((s) => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 border border-stone/30 px-4 py-1.5 text-label uppercase tracking-[0.08em] text-bone hover:border-accent hover:text-accent transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </Container>
      </nav>

      {/* Discovery Sets */}
      <Section id="discovery-sets" className="bg-ink">
        <Container>
          <div className="mb-10 max-w-2xl">
            <p className="text-label uppercase tracking-[0.1em] text-accent">Discovery Set</p>
            <h2 className="mt-2 font-display text-h1 text-bone">Find your Number</h2>
          </div>

          {discoveryLive.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              {discoveryLive.map((p) => (
                <CategoryProductTile
                  key={p.handle}
                  product={p}
                  href={`/products/${p.handle}`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              {GIFTS.map((gift) => (
                <DiscoverySetCard key={gift.id} gift={gift} />
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* Gift Sets, only when Medusa has products */}
      {showGiftSets && (
        <Section id="gift-sets" className="bg-mist/40">
          <Container>
            <div className="mb-10 max-w-2xl">
              <p className="text-label uppercase tracking-[0.1em] text-accent">Gift Sets</p>
              <h2 className="mt-2 font-display text-h1 text-bone">Ready to give</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {giftsLive.map((p) => (
                <CategoryProductTile
                  key={p.handle}
                  product={p}
                  href={`/products/${p.handle}`}
                />
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* Shop by occasion */}
      <section
        id="occasions"
        className="border-t border-stone/20 bg-ink py-14"
      >
        <Container>
          <div className="mb-8 max-w-2xl">
            <p className="text-label uppercase tracking-[0.1em] text-accent">By Occasion</p>
            <h2 className="mt-2 font-display text-h1 text-bone">What are you celebrating?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {OCCASIONS.map((occ) => (
              <Link
                key={occ.label}
                href={occ.href}
                className="group flex flex-col items-center gap-2 border border-stone/20 bg-white/5 py-6 text-center hover:border-accent transition-colors duration-150"
              >
                <span className="text-2xl" aria-hidden="true">{occ.emoji}</span>
                <span className="text-label uppercase tracking-[0.08em] text-bone group-hover:text-accent transition-colors">
                  {occ.label}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Corporate gifting CTA */}
      <section className="border-t border-stone/20 bg-ink py-14">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-h1 text-bone max-w-md">
            Gifting for your team or clients?
          </h2>
          <Link
            href="/b2b"
            className="shrink-0 inline-flex items-center justify-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 48 }}
          >
            Get in Touch
          </Link>
        </Container>
      </section>
    </>
  )
}
