import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import { HOME_DIFFUSERS } from '@/data/products'
import { formatNaira } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/config'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Home & Car',
  description:
    'Scent your home and car with Impact. Home diffusers, scent candles, and scenting machines designed to last.',
  openGraph: {
    title: 'Home & Car · Impact Perfumes',
    description: 'Home diffusers, scent candles, and scenting machines from Impact Perfumes.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

interface SubCategory {
  id: string
  label: string
  eyebrow: string
  heading: string
  description: string
  medusaHandle: string
  staticFallback?: { handle: string; title: string; descriptor: string; signatureColor: string; tagline: string; badge: string }[]
}

const SUBCATEGORIES: SubCategory[] = [
  {
    id: 'home-diffusers',
    label: 'Home Diffusers',
    eyebrow: 'For the Home',
    heading: 'Home Diffusers',
    description:
      'Reed diffusers that slowly release fragrance into your space. Minimal design, maximum presence.',
    medusaHandle: 'home-diffusers',
    staticFallback: HOME_DIFFUSERS,
  },
  {
    id: 'scent-candles',
    label: 'Scent Candles',
    eyebrow: 'Light & Linger',
    heading: 'Scent Candles',
    description:
      'Hand-poured candles in our signature fragrances. Burn time up to 50 hours.',
    medusaHandle: 'scent-candles',
  },
  {
    id: 'scenting-machines',
    label: 'Scenting Machines',
    eyebrow: 'Always On',
    heading: 'Scenting Machines',
    description:
      'Cold-air diffusion machines for hotels, offices, and large spaces. Consistent fragrance, all day.',
    medusaHandle: 'scenting-machines',
  },
]

async function loadSubcategory(sub: SubCategory): Promise<CategoryProduct[]> {
  const medusaProducts = await getProductsByCategory(sub.medusaHandle)
  if (medusaProducts.length > 0) return medusaProducts.map(toCategoryProduct)
  if (sub.staticFallback) {
    return sub.staticFallback.map((s) => ({
      handle: s.handle,
      title: s.title,
      descriptor: s.descriptor,
      signatureColor: s.signatureColor,
      tagline: s.tagline,
      priceKobo: 0,
      imageUrl: null,
    }))
  }
  return []
}

function ProductTile({ product }: { product: CategoryProduct }) {
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 border border-stone/20 bg-white/[0.02] py-16 px-8 text-center">
      <p className="font-display text-h2 text-bone">{label} — coming soon</p>
      <p className="max-w-md text-body text-stone">
        We&apos;re curating this collection now. Be the first to know when it lands.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={SITE_CONFIG.social.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center bg-accent px-6 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
          style={{ height: 44 }}
        >
          Notify me on WhatsApp
        </Link>
        <Link
          href="/b2b"
          className="inline-flex items-center border border-stone/40 px-6 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
          style={{ height: 44 }}
        >
          Bulk inquiry
        </Link>
      </div>
    </div>
  )
}

export default async function HomeAndCarPage() {
  const subData = await Promise.all(
    SUBCATEGORIES.map(async (sub) => ({ sub, products: await loadSubcategory(sub) }))
  )

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink py-16 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Home & Car</p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none text-bone">
            Every Room.
            <br />
            Every Journey.
          </h1>
          <p className="mt-5 max-w-lg text-body text-stone">
            Long-lasting diffusers, hand-poured candles, and professional scenting
            machines. Composed in Lagos, designed to fill a space — not overpower it.
          </p>
        </Container>
      </section>

      {/* Sticky sub-nav */}
      <nav
        aria-label="Sub-category navigation"
        className="sticky top-16 z-30 border-b border-stone/20 bg-ink/95 backdrop-blur-sm"
      >
        <Container className="flex items-center gap-2 overflow-x-auto py-3">
          {SUBCATEGORIES.map((sub) => (
            <Link
              key={sub.id}
              href={`#${sub.id}`}
              className="shrink-0 border border-stone/30 px-4 py-1.5 text-label uppercase tracking-[0.08em] text-bone hover:border-accent hover:text-accent transition-colors"
            >
              {sub.label}
            </Link>
          ))}
        </Container>
      </nav>

      {/* Sub-category sections */}
      {subData.map(({ sub, products }, idx) => (
        <Section
          key={sub.id}
          id={sub.id}
          className={idx % 2 === 0 ? 'bg-ink' : 'bg-mist/40'}
        >
          <Container>
            <div className="mb-10 max-w-2xl">
              <p className="text-label uppercase tracking-[0.1em] text-accent">{sub.eyebrow}</p>
              <h2 className="mt-2 font-display text-h1 text-bone">{sub.heading}</h2>
              <p className="mt-3 text-body text-stone">{sub.description}</p>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <ProductTile key={p.handle} product={p} />
                ))}
              </div>
            ) : (
              <EmptyState label={sub.heading} />
            )}
          </Container>
        </Section>
      ))}

      {/* Editorial divider */}
      <section className="bg-stone/10 py-14 border-y border-stone/20">
        <Container className="grid gap-8 md:grid-cols-3">
          {[
            { heading: 'Slow release', body: 'Reeds and candles fill a room gradually — no sudden spikes, no fades.' },
            { heading: 'Lagos-made', body: 'Every diffuser, candle, and machine is composed with the same care as the Number Series.' },
            { heading: 'Built to last', body: 'Diffusers up to 90 days. Candles up to 50 hours. Machines that run for years.' },
          ].map((f) => (
            <div key={f.heading}>
              <p className="font-display text-h3 text-bone">{f.heading}</p>
              <p className="mt-1 text-small text-stone">{f.body}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-stone/20 bg-ink py-16 text-bone">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-stone">Scent your world</p>
            <h2 className="mt-2 font-display text-h1 text-bone max-w-md">
              Hotel, office, or event space?
            </h2>
            <p className="mt-3 text-body text-stone max-w-sm">
              Talk to us about scenting at scale. Custom blends and white-glove installation across Nigeria.
            </p>
          </div>
          <Link
            href="/b2b"
            className="shrink-0 inline-flex items-center justify-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 48 }}
          >
            Talk to us
          </Link>
        </Container>
      </section>
    </>
  )
}
