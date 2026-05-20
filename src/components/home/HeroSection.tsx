import Link from 'next/link'
import { Container } from '@/components/layout'
import HeroSlideshow from './HeroSlideshow'

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-ink text-bone">
      {/* Slideshow, images + gradients + indicators */}
      <HeroSlideshow />

      {/* Decorative vertical rule */}
      <span
        className="pointer-events-none absolute bottom-0 left-[58%] top-0 hidden w-px select-none bg-stone opacity-[0.15] md:block"
        aria-hidden="true"
      />

      <Container className="relative pb-20 pt-16 sm:pb-28">
        {/* Thin gold rule, a luxury editorial signature */}
        <div className="mb-6 w-10 border-t border-accent" />

        <p className="text-label uppercase tracking-[0.14em] text-accent">
          Est. Lagos · The Number Series
        </p>

        <h1 className="mt-4 max-w-2xl font-display text-[40px] leading-[1.05] sm:text-display-l text-balance">
          Crafted in Lagos.
          <br />
          Composed for character.
        </h1>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/no-series"
            className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink transition-all duration-300 ease-soft hover:opacity-90 hover:-translate-y-0.5"
            style={{ height: 52 }}
          >
            Shop the Collection
          </Link>
          <Link
            href="/quiz"
            className="inline-flex items-center border border-bone/30 px-8 text-label uppercase tracking-[0.1em] text-bone/80 transition-all duration-300 hover:border-bone hover:text-bone"
            style={{ height: 52 }}
          >
            Find your fragrance
          </Link>
        </div>
      </Container>
    </section>
  )
}
