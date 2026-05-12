import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import { GIFTS, OCCASIONS } from '@/data/products'
import { formatNaira } from '@/lib/format'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Gifts',
  description:
    'Give the gift of scent. Discovery sets, curated gift boxes, and the complete Number Series — beautifully packaged.',
  openGraph: {
    title: 'Gifts · Impact Perfumes',
    description: 'Curated fragrance gifts from Impact Perfumes, Lagos.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function GiftsPage() {
  const [giftsProducts, discoveryProducts] = await Promise.all([
    getProductsByCategory('gifts'),
    getProductsByCategory('discovery'),
  ])

  const allMedusaProducts = [...giftsProducts, ...discoveryProducts]
  const useMedusa = allMedusaProducts.length > 0
  const liveProducts: CategoryProduct[] = useMedusa
    ? allMedusaProducts.map(toCategoryProduct)
    : []

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink text-bone py-20 md:py-28">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-stone">Gifting</p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none">
            Give a Scent.
            <br />
            Leave a Memory.
          </h1>
          <p className="mt-5 max-w-lg text-body text-stone">
            Every Impact fragrance arrives in signature packaging, ready to give.
            Start with a Discovery Set if you&apos;re unsure. Or build something entirely personal.
          </p>
          <div className="mt-8">
            <Link
              href="#sets"
              className="inline-flex items-center bg-bone px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
              style={{ height: 48 }}
            >
              Shop Gift Sets
            </Link>
          </div>
        </Container>
      </section>

      {/* Gift Sets */}
      <Section id="sets">
        <Container>
          <p className="text-label uppercase tracking-[0.1em] text-accent mb-10">Gift Sets</p>

          {useMedusa ? (
            <div className="grid grid-cols-2 gap-px bg-stone/20 sm:grid-cols-3">
              {liveProducts.map((product) => (
                <Link
                  key={product.handle}
                  href={`/products/${product.handle}`}
                  className="group relative flex flex-col overflow-hidden bg-bone"
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
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-display text-[4rem] text-white/15 select-none">
                        {product.title.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5 border-t border-stone/20">
                    <p className="text-label uppercase tracking-[0.1em] text-slate">{product.descriptor}</p>
                    <h3 className="mt-1 font-display text-h3">{product.title}</h3>
                    <p className="mt-1 text-small text-slate italic">{product.tagline}</p>
                    <div className="mt-4">
                      <span className="text-body font-medium">
                        {product.priceKobo > 0 ? formatNaira(product.priceKobo) : 'Coming soon'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <>
              {/* Discovery Set — featured wide */}
              {GIFTS.filter((g) => g.featured).map((gift) => (
                <div
                  key={gift.id}
                  className="grid md:grid-cols-2 gap-px bg-stone/20 mb-px"
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
                  <div className="flex flex-col justify-center bg-bone p-10 md:p-14">
                    <p className="text-label uppercase tracking-[0.1em] text-slate">{gift.subtitle}</p>
                    <h2 className="mt-3 font-display text-h1">{gift.title}</h2>
                    <p className="mt-4 text-body text-slate max-w-sm">{gift.description}</p>
                    <Link
                      href={gift.cta.href}
                      className="mt-8 self-start inline-flex items-center bg-ink px-8 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity"
                      style={{ height: 48 }}
                    >
                      {gift.cta.label}
                    </Link>
                  </div>
                </div>
              ))}

              {/* Other gift sets */}
              <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-3 mt-px">
                {GIFTS.filter((g) => !g.featured).map((gift) => (
                  <div key={gift.id} className="group flex flex-col overflow-hidden bg-bone">
                    <div
                      className="flex items-end p-8 transition-transform duration-500 group-hover:scale-[1.01]"
                      style={{ backgroundColor: gift.signatureColor, aspectRatio: '4/3' }}
                    >
                      <span className="inline-block border border-bone/20 px-2 py-0.5 text-label uppercase tracking-[0.1em] text-bone/60">
                        {gift.label}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col border-t border-stone/20 p-6">
                      <p className="text-label text-slate">{gift.subtitle}</p>
                      <h3 className="mt-1 font-display text-h3">{gift.title}</h3>
                      <p className="mt-2 text-small text-slate">{gift.description}</p>
                      <Link
                        href={gift.cta.href}
                        className="mt-5 self-start text-label uppercase tracking-[0.1em] text-accent hover:underline underline-offset-2 transition-colors"
                      >
                        {gift.cta.label}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Container>
      </Section>

      {/* Shop by occasion */}
      <section className="border-t border-stone/20 bg-mist py-14">
        <Container>
          <p className="text-label uppercase tracking-[0.1em] text-accent mb-2">By Occasion</p>
          <h2 className="font-display text-h1 mb-8">What are you celebrating?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {OCCASIONS.map((occ) => (
              <Link
                key={occ.label}
                href={occ.href}
                className="group flex flex-col items-center gap-2 border border-stone/20 bg-bone py-6 text-center hover:border-ink transition-colors duration-150"
              >
                <span className="text-2xl" aria-hidden="true">{occ.emoji}</span>
                <span className="text-label uppercase tracking-[0.08em] text-ink group-hover:text-accent transition-colors">
                  {occ.label}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Corporate gifting CTA */}
      <section className="border-t border-stone/20 py-16">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-accent">Corporate Gifting</p>
            <h2 className="mt-2 font-display text-h1 max-w-md">
              Gifting for your team, clients, or event?
            </h2>
            <p className="mt-3 text-body text-slate max-w-sm">
              Custom quantities, branded packaging, and white-glove delivery across Nigeria.
            </p>
          </div>
          <Link
            href="/b2b"
            className="shrink-0 inline-flex items-center justify-center bg-ink px-8 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity"
            style={{ height: 48 }}
          >
            Get in Touch
          </Link>
        </Container>
      </section>
    </>
  )
}
