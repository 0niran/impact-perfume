import Link from 'next/link'
import { Container } from '@/components/layout'

export default function HomepageQuizSection() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: '#E4B250' }}>
      <Container className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-lg">
          <p className="text-label uppercase tracking-[0.14em] text-ink/50">
            Fragrance Finder
          </p>
          <h2 className="mt-4 font-display text-[32px] md:text-display-s leading-[1.05] text-ink">
            Not sure where to start?
          </h2>
          <p className="mt-4 text-body text-ink/65 max-w-md">
            Five questions. Takes 90 seconds. We match you to the Number made for you.
          </p>
        </div>
        <Link
          href="/quiz"
          className="shrink-0 inline-flex items-center justify-center bg-ink px-10 text-label uppercase tracking-[0.1em] text-bone transition-all duration-300 hover:bg-ink/80"
          style={{ height: 52 }}
        >
          Find Your Number
        </Link>
      </Container>
    </section>
  )
}
