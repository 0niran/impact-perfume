import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import { CAR_DIFFUSERS, HOME_DIFFUSERS } from '@/data/products'
import { formatNaira } from '@/lib/format'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Home Fragrance',
  description:
    'Fill every space with scent. Car diffusers and home diffusers from Impact Perfumes — designed to last.',
  openGraph: {
    title: 'Home Fragrance · Impact Perfumes',
    description: 'Car diffusers and home diffusers from Impact Perfumes.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

function StaticProductTile({
  title,
  descriptor,
  signatureColor,
  tagline,
  badge,
}: {
  title: string
  descriptor: string
  signatureColor: string
  tagline: string
  badge: string
}) {
  return (
    <div className="group flex flex-col overflow-hidden bg-bone">
      <div
        className="relative flex items-end p-5 transition-transform duration-500 group-hover:scale-[1.01]"
        style={{ backgroundColor: signatureColor, aspectRatio: '4/3' }}
      >
        <span className="relative text-label uppercase tracking-[0.1em] text-white/60">
          {badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col border-t border-stone/20 p-5">
        <p className="text-label text-slate">{descriptor}</p>
        <h3 className="mt-1 font-display text-h3">{title}</h3>
        <p className="mt-1 text-small text-slate italic">{tagline}</p>
        <p className="mt-4 text-small text-stone">Coming soon</p>
      </div>
    </div>
  )
}

export default async function HomeFragrancePage() {
  const medusaProducts = await getProductsByCategory('home-fragrance')
  const useMedusa = medusaProducts.length > 0
  const liveProducts: CategoryProduct[] = useMedusa
    ? medusaProducts.map(toCategoryProduct)
    : []

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-bone py-16 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Home Fragrance</p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none">
            Every Room.
            <br />
            Every Journey.
          </h1>
          <p className="mt-5 max-w-lg text-body text-slate">
            From your morning commute to your living room at dusk. Scent the spaces
            that frame your day. Long-lasting diffusers designed to fill a room,
            not overpower it.
          </p>
        </Container>
      </section>

      {useMedusa ? (
        /* Medusa product grid */
        <Section id="collection">
          <Container>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-label uppercase tracking-[0.1em] text-accent">The Collection</p>
                <h2 className="mt-2 font-display text-h1">
                  {liveProducts.length} {liveProducts.length === 1 ? 'Product' : 'Products'}
                </h2>
              </div>
            </div>

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
          </Container>
        </Section>
      ) : (
        <>
          {/* Car Diffusers */}
          <Section>
            <Container>
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-label uppercase tracking-[0.1em] text-accent">On the Move</p>
                  <h2 className="mt-2 font-display text-h1">Car Diffusers</h2>
                  <p className="mt-2 max-w-md text-small text-slate">
                    Clip-on diffusers with up to 60 days of continuous fragrance.
                    Vent-mounted, no mess, no refills.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-3">
                {CAR_DIFFUSERS.map((d) => (
                  <StaticProductTile
                    key={d.handle}
                    title={d.title}
                    descriptor={d.descriptor}
                    signatureColor={d.signatureColor}
                    tagline={d.tagline}
                    badge={d.badge}
                  />
                ))}
              </div>
            </Container>
          </Section>

          {/* Divider editorial */}
          <section className="bg-mist py-12 border-y border-stone/20">
            <Container className="grid gap-8 md:grid-cols-3">
              {[
                { heading: 'Up to 60 days', body: 'Car diffusers last all month. No refills, no fuss.' },
                { heading: 'Reed diffusers', body: 'Slow-release reeds fill a room subtly, without spikes or fades.' },
                { heading: 'Lagos-made', body: 'Every product is crafted with the same care as the Number Series.' },
              ].map((f) => (
                <div key={f.heading}>
                  <p className="font-display text-h3">{f.heading}</p>
                  <p className="mt-1 text-small text-slate">{f.body}</p>
                </div>
              ))}
            </Container>
          </section>

          {/* Home Diffusers */}
          <Section>
            <Container>
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-label uppercase tracking-[0.1em] text-accent">For the Home</p>
                  <h2 className="mt-2 font-display text-h1">Home Diffusers</h2>
                  <p className="mt-2 max-w-md text-small text-slate">
                    Reed diffusers that slowly release fragrance into your space.
                    Minimal design, maximum presence.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-3">
                {HOME_DIFFUSERS.map((d) => (
                  <StaticProductTile
                    key={d.handle}
                    title={d.title}
                    descriptor={d.descriptor}
                    signatureColor={d.signatureColor}
                    tagline={d.tagline}
                    badge={d.badge}
                  />
                ))}
              </div>
            </Container>
          </Section>
        </>
      )}

      {/* CTA */}
      <section className="border-t border-stone/20 bg-ink py-16 text-bone">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-stone">Scent your world</p>
            <h2 className="mt-2 font-display text-h1 max-w-md">
              Want to scent your office, hotel, or event space?
            </h2>
          </div>
          <Link
            href="/b2b"
            className="shrink-0 inline-flex items-center justify-center border border-bone/30 px-8 text-label uppercase tracking-[0.1em] text-bone hover:bg-bone hover:text-ink transition-colors"
            style={{ height: 48 }}
          >
            Talk to us
          </Link>
        </Container>
      </section>
    </>
  )
}
