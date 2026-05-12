import Link from 'next/link'
import { Container } from '@/components/layout'

export default function HomepageQuizSection() {
  return (
    <section className="border-t border-stone/20 bg-mist py-20 md:py-24">
      <Container className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-lg">
          <p className="text-label uppercase tracking-[0.12em] text-stone">
            Fragrance Finder
          </p>
          <h2 className="mt-3 font-display text-h1 md:text-display-s leading-none text-bone">
            Not sure where to start?
          </h2>
          <p className="mt-4 text-body text-stone max-w-md">
            Five questions. We match you to the Number from our collection
            that fits who you are — your mood, your rhythm, your skin.
          </p>
        </div>
        <Link
          href="/quiz"
          className="shrink-0 inline-flex items-center justify-center border border-bone/30 px-10 text-label uppercase tracking-[0.1em] text-bone hover:bg-bone hover:text-ink transition-colors duration-200"
          style={{ height: 52 }}
        >
          Find Your Number
        </Link>
      </Container>
    </section>
  )
}
