import Link from 'next/link'
import { Container } from '@/components/layout'
import HeroSlideshow from './HeroSlideshow'

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-ink text-bone">
      {/* Slideshow — images + gradients + indicators */}
      <HeroSlideshow />

      {/* Decorative vertical rule */}
      <span
        className="pointer-events-none absolute bottom-0 left-[58%] top-0 hidden w-px select-none bg-bone opacity-[0.05] md:block"
        aria-hidden="true"
      />

      <Container className="relative pb-16 pt-28 sm:pb-20 sm:pt-40 md:pb-28">
        <p className="text-label uppercase tracking-[0.12em] text-stone">
          Impact Perfumes &amp; Oils · Est. Lagos
        </p>

        <h1 className="mt-5 max-w-3xl font-display text-[36px] leading-[1.1] sm:text-display-l md:text-display-xl text-balance">
          Crafted in Lagos.
          <br />
          Composed for character.
        </h1>

        <p className="mt-6 max-w-md text-body sm:text-body-l text-stone">
          Fragrances that leave a mark. Oils that linger.
          <br />
          A house built for those who make an impression.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link
            href="/shop"
            className="inline-flex items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink transition-transform duration-200 ease-soft hover:-translate-y-0.5"
            style={{ height: 52 }}
          >
            Explore Collections
          </Link>
        </div>
      </Container>
    </section>
  )
}
