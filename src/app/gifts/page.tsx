import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import { GIFTS, OCCASIONS, type GiftProduct } from '@/data/products'
import { formatNaira } from '@/lib/format'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Gifts & Discovery',
  description:
    'Give the gift of scent. Discovery sets to find your Number, curated gift boxes for every occasion.',
  openGraph: {
    title: 'Gifts & Discovery · Impact Perfumes',
    description: 'Curated fragrance gifts and discovery sets from Impact Perfumes, Lagos.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

function MedusaProductTile({ product }: { product: CategoryProduct }) {
  return (
    <Link
      href={`/products/${product.handle}`}
      className="group relative flex flex-col overflow-hidden bg-ink"
    >
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: product.signatureColor, aspectRatio: '4/3' }}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display text-[4rem] text-white/15 select-none">
            {product.title.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 border-t border-stone/20">
        <p className="text-label uppercase tracking-[0.1em] text-stone">{product.descriptor}</p>
        <h3 className="mt-1 font-display text-h3 text-bone">{product.title}</h3>
        <p className="mt-1 text-small text-stone italic">{product.tagline}</p>
        <p className="mt-4 text-body font-medium text-bone">
          {product.priceKobo > 0 ? formatNaira(product.priceKobo) : 'Coming soon'}
        </p>
      </div>
    </Link>
  )
}

function StaticGiftTile({ gift }: { gift: GiftProduct }) {
  return (
    <div className="group flex flex-col overflow-hidden bg-ink">
      <div
        className="flex items-end p-8 transition-transform duration-500 group-hover:scale-[1.01]"
        style={{ backgroundColor: gift.signatureColor, aspectRatio: '4/3' }}
      >
        <span className="inline-block border border-bone/20 px-2 py-0.5 text-label uppercase tracking-[0.1em] text-bone/60">
          {gift.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col border-t border-stone/20 p-6">
        <p className="text-label text-stone">{gift.subtitle}</p>
        <h3 className="mt-1 font-display text-h3 text-bone">{gift.title}</h3>
        <p className="mt-2 text-small text-stone">{gift.description}</p>
        <Link
          href={gift.cta.href}
          className="mt-5 self-start text-label uppercase tracking-[0.1em] text-accent hover:underline underline-offset-2 transition-colors"
        >
          {gift.cta.label}
        </Link>
      </div>
    </div>
  )
}

const SUBNAV = [
  { id: 'discovery-sets', label: 'Discovery' },
  { id: 'gift-sets', label: 'Gift Sets' },
  { id: 'occasions', label: 'By Occasion' },
] as const

export default async function GiftsPage() {
  const [discoveryMedusa, giftsMedusa] = await Promise.all([
    getProductsByCategory('discovery'),
    getProductsByCategory('gifts'),
  ])

  const discoveryLive = discoveryMedusa.map(toCategoryProduct)
  const giftsLive = giftsMedusa.map(toCategoryProduct)

  // Static fallbacks split by intent
  const discoveryStatic = GIFTS.filter((g) => g.id === 'discovery-set')
  const giftsStatic = GIFTS.filter((g) => g.id !== 'discovery-set')

  const showDiscoveryLive = discoveryLive.length > 0
  const showGiftsLive = giftsLive.length > 0

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink text-bone py-20 md:py-28">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Gifts & Discovery</p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none">
            Give a Scent.
            <br />
            Leave a Memory.
          </h1>
          <p className="mt-5 max-w-lg text-body text-stone">
            Every Impact fragrance arrives in signature packaging, ready to give.
            Start with a Discovery Set to find their Number — or skip ahead to a
            curated gift box.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#discovery-sets"
              className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
              style={{ height: 48 }}
            >
              Start with Discovery
            </Link>
            <Link
              href="#gift-sets"
              className="inline-flex items-center border border-stone/40 px-8 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
              style={{ height: 48 }}
            >
              Shop Gift Sets
            </Link>
          </div>
        </Container>
      </section>

      {/* Sticky sub-nav */}
      <nav
        aria-label="Sub-category navigation"
        className="sticky top-16 z-30 border-b border-stone/20 bg-ink/95 backdrop-blur-sm"
      >
        <Container className="flex items-center gap-2 overflow-x-auto py-3">
          {SUBNAV.map((s) => (
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

      {/* Discovery Sets — sample-first journey */}
      <Section id="discovery-sets" className="bg-ink">
        <Container>
          <div className="mb-10 max-w-2xl">
            <p className="text-label uppercase tracking-[0.1em] text-accent">Try Before You Commit</p>
            <h2 className="mt-2 font-display text-h1 text-bone">Discovery Sets</h2>
            <p className="mt-3 text-body text-stone">
              A handpicked selection of miniatures from the Number Series — the
              perfect way to find your Number, or gift the experience to someone
              else.
            </p>
          </div>

          {showDiscoveryLive ? (
            <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-2 lg:grid-cols-3">
              {discoveryLive.map((p) => (
                <MedusaProductTile key={p.handle} product={p} />
              ))}
            </div>
          ) : (
            <div className="grid gap-px bg-stone/20 md:grid-cols-2">
              {discoveryStatic.map((gift) => (
                <div
                  key={gift.id}
                  className="grid md:col-span-2 md:grid-cols-2 gap-px bg-stone/20"
                >
                  <div
                    className="flex items-end p-10 md:p-14"
                    style={{ backgroundColor: gift.signatureColor, minHeight: 340 }}
                  >
                    <div>
                      <span className="inline-block border border-bone/30 px-3 py-1 text-label uppercase tracking-[0.1em] text-bone/70 mb-4">
                        {gift.label}
                      </span>
                      <p className="font-display text-display-l leading-none text-bone">
                        {gift.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center bg-ink p-10 md:p-14">
                    <p className="text-label uppercase tracking-[0.1em] text-stone">{gift.subtitle}</p>
                    <h3 className="mt-3 font-display text-h1 text-bone">{gift.title}</h3>
                    <p className="mt-4 text-body text-stone max-w-sm">{gift.description}</p>
                    <Link
                      href={gift.cta.href}
                      className="mt-8 self-start inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
                      style={{ height: 48 }}
                    >
                      {gift.cta.label}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* Gift Sets */}
      <Section id="gift-sets" className="bg-mist/40">
        <Container>
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-label uppercase tracking-[0.1em] text-accent">Ready to Give</p>
              <h2 className="mt-2 font-display text-h1 text-bone">Gift Sets</h2>
              <p className="mt-3 text-body text-stone">
                Curated boxes in our signature packaging. Choose a Duo, a Trio, or
                the full Wardrobe.
              </p>
            </div>
            <Link
              href="/b2b"
              className="shrink-0 text-label uppercase tracking-[0.08em] text-stone hover:text-accent transition-colors"
            >
              Corporate gifting →
            </Link>
          </div>

          {showGiftsLive ? (
            <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-2 lg:grid-cols-3">
              {giftsLive.map((p) => (
                <MedusaProductTile key={p.handle} product={p} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-3">
              {giftsStatic.map((gift) => (
                <StaticGiftTile key={gift.id} gift={gift} />
              ))}
            </div>
          )}
        </Container>
      </Section>

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
      <section className="border-t border-stone/20 bg-ink py-16">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">Corporate Gifting</p>
            <h2 className="mt-2 font-display text-h1 text-bone max-w-md">
              Gifting for your team, clients, or event?
            </h2>
            <p className="mt-3 text-body text-stone max-w-sm">
              Custom quantities, branded packaging, and white-glove delivery across Nigeria.
            </p>
          </div>
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
