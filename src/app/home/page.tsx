import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/layout'

export const metadata: Metadata = {
  title: 'Home & Car',
  description:
    'Scent your home and car with Impact. Home diffusers, scent candles, scenting machines, and car diffusers designed to last.',
  openGraph: {
    title: 'Home & Car · Impact Perfumes',
    description: 'Home diffusers, scent candles, scenting machines, and car diffusers from Impact Perfumes.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

const CATEGORIES = [
  {
    href: '/home-diffusers',
    eyebrow: 'For the Home',
    title: 'Home Diffusers',
    description: 'Reed diffusers that fill a room slowly and evenly.',
    color: '#8B2252',
  },
  {
    href: '/scent-candles',
    eyebrow: 'Light & Linger',
    title: 'Scent Candles',
    description: 'Hand-poured soy candles, up to 50 hours.',
    color: '#6B4423',
  },
  {
    href: '/scenting-machines',
    eyebrow: 'Always On',
    title: 'Scenting Machines',
    description: 'Cold-air diffusion for hotels, offices, and large spaces.',
    color: '#2B2B2B',
  },
  {
    href: '/car-diffusers',
    eyebrow: 'On the Move',
    title: 'Car Diffusers',
    description: 'Vent-mounted clip-ons. Up to 60 days per refill.',
    color: '#1B5E8C',
  },
]

export default function HomeAndCarPage() {
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
            machines. Designed to fill a space, not overpower it.
          </p>
        </Container>
      </section>

      {/* Category cards */}
      <section className="bg-ink py-10 md:py-14">
        <Container>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative flex flex-col justify-between overflow-hidden border border-stone/15 bg-ink p-8 transition-colors hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ minHeight: 200 }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-50 transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: `radial-gradient(ellipse at top right, ${cat.color}33 0%, transparent 60%)` }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <p className="text-label uppercase tracking-[0.1em] text-accent">{cat.eyebrow}</p>
                  <h2 className="mt-2 font-display text-h1 text-bone">{cat.title}</h2>
                  <p className="mt-2 max-w-sm text-body text-stone">{cat.description}</p>
                </div>
                <span className="relative mt-6 inline-flex items-center gap-2 text-label uppercase tracking-[0.1em] text-bone group-hover:text-accent transition-colors">
                  Shop {cat.title}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path d="M9 1l4 4-4 4M13 5H1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-stone/20 bg-ink py-14">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-h1 text-bone max-w-md">
            Hotel, office, or event space?
          </h2>
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
