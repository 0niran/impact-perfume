import Link from 'next/link'
import { Container } from '@/components/layout'

export default function DiscoveryBlock() {
  return (
    <section className="section-y bg-ink">
      <Container>
        <div className="flex flex-col justify-between gap-8 border border-stone/20 px-8 py-12 md:flex-row md:items-center md:px-16 md:py-16">
          <div className="text-bone">
            <p className="text-label uppercase tracking-[0.1em] text-stone">Discovery Set</p>
            <h2 className="mt-3 font-display text-h1 md:text-display-s leading-none">
              Try Before You Commit
            </h2>
            <p className="mt-4 max-w-md text-body text-stone">
              Curated sample sets from across the house. The full story, in miniature.
            </p>
          </div>
          <Link
            href="/gifts"
            className="inline-flex shrink-0 items-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink transition-transform duration-200 ease-soft hover:-translate-y-0.5"
            style={{ height: 52 }}
          >
            Shop the Set
          </Link>
        </div>
      </Container>
    </section>
  )
}
