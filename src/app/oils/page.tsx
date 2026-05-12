import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import { OILS } from '@/data/products'
import { FALLBACK_COLOR } from '@/lib/constants'
import { formatNaira } from '@/lib/format'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Impact Oils',
  description:
    'Long-lasting, concentrated fragrance oils. No alcohol, just pure scent.',
  openGraph: {
    title: 'Impact Oils · Impact Perfumes',
    description: 'Concentrated fragrance oils crafted in Lagos.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function OilsPage() {
  const medusaProducts = await getProductsByCategory('oils')
  const useMedusa = medusaProducts.length > 0
  const liveProducts: CategoryProduct[] = useMedusa
    ? medusaProducts.map(toCategoryProduct)
    : []

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-bone py-16 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Impact Oils</p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none">
            Pure Scent.
            <br />
            No Compromise.
          </h1>
          <p className="mt-5 max-w-lg text-body text-slate">
            Alcohol-free and highly concentrated. Our fragrance oils last longer on skin,
            layer beautifully with your Number, and travel without restriction.
            One drop is all it takes.
          </p>
          <div className="mt-8">
            <a
              href="#collection"
              className="inline-flex items-center bg-ink px-8 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity"
              style={{ height: 48 }}
            >
              Shop Oils
            </a>
          </div>
        </Container>
      </section>

      {/* Editorial strip */}
      <section className="bg-mist py-12 border-b border-stone/20">
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { heading: 'Alcohol-Free', body: 'Pure concentration means the scent opens directly on your skin. No sharp top notes, just the heart.' },
              { heading: 'Layer Freely', body: 'Apply beneath your EDP to anchor the scent, or wear alone for a close, skin-intimate effect.' },
              { heading: 'Lasts All Day', body: 'Concentrated formula means a single application carries through morning, noon, and night.' },
            ].map((item) => (
              <div key={item.heading}>
                <p className="font-display text-h3">{item.heading}</p>
                <p className="mt-1 text-small text-slate">{item.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Product grid */}
      <Section id="collection">
        <Container>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-accent">The Collection</p>
              <h2 className="mt-2 font-display text-h1">
                {useMedusa ? liveProducts.length : OILS.length} Oils
              </h2>
            </div>
            <p className="text-small text-slate hidden sm:block">12ml · Concentrated · Roll-on</p>
          </div>

          {useMedusa ? (
            <div className="grid grid-cols-2 gap-px bg-stone/20 sm:grid-cols-3">
              {liveProducts.map((oil) => (
                <Link
                  key={oil.handle}
                  href={`/products/${oil.handle}`}
                  className="group relative flex flex-col overflow-hidden bg-bone"
                >
                  <div
                    className="relative overflow-hidden"
                    style={{ backgroundColor: oil.signatureColor, aspectRatio: '1/1' }}
                  >
                    {oil.imageUrl ? (
                      <Image
                        src={oil.imageUrl}
                        alt={oil.title}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-display text-[4rem] text-white/15 select-none">
                        {oil.title.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5 border-t border-stone/20">
                    <p className="text-label uppercase tracking-[0.1em] text-slate">{oil.descriptor}</p>
                    <h3 className="mt-1 font-display text-h3">{oil.title}</h3>
                    <p className="mt-1 text-small text-slate italic">{oil.tagline}</p>
                    <div className="mt-4">
                      <span className="text-body font-medium">
                        {oil.priceKobo > 0 ? formatNaira(oil.priceKobo) : 'Coming soon'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-stone/20 sm:grid-cols-3">
              {OILS.map((oil) => (
                <div
                  key={oil.handle}
                  className="group relative flex flex-col overflow-hidden bg-bone"
                >
                  <div
                    className="relative flex items-end justify-start p-5 transition-transform duration-500 group-hover:scale-[1.02]"
                    style={{ backgroundColor: oil.signatureColor, aspectRatio: '1/1' }}
                  >
                    <span className="font-display text-[4rem] leading-none text-white/15 select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      {oil.handle.replace('oil-no-', '')}
                    </span>
                    <span className="relative text-label uppercase tracking-[0.1em] text-white/70">{oil.badge}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 border-t border-stone/20">
                    <p className="text-label uppercase tracking-[0.1em] text-slate">{oil.descriptor}</p>
                    <h3 className="mt-1 font-display text-h3">{oil.title}</h3>
                    <p className="mt-1 text-small text-slate italic">{oil.tagline}</p>
                    <div className="mt-4">
                      <span className="text-small text-stone">Coming soon</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>

      {/* CTA */}
      <section className="border-t border-stone/20 bg-ink py-16 text-bone">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-stone">Pro tip</p>
            <h2 className="mt-2 font-display text-h1 max-w-md">
              Layer your Oil with your Number for a signature that&apos;s entirely yours.
            </h2>
          </div>
          <Link
            href="/shop"
            className="shrink-0 inline-flex items-center justify-center border border-bone/30 px-8 text-label uppercase tracking-[0.1em] text-bone hover:bg-bone hover:text-ink transition-colors"
            style={{ height: 48 }}
          >
            Shop the Number Collection
          </Link>
        </Container>
      </section>
    </>
  )
}
