import { Container } from '@/components/layout'

export default function CollectionHero() {
  return (
    <section className="border-b border-stone/20 bg-bone py-10 md:py-14">
      <Container>
        <p className="text-label uppercase tracking-[0.12em] text-accent">
          The Number Series
        </p>
        <h1 className="mt-3 font-display text-[36px] leading-[1.1] md:text-display-l">
          50 Numbers. One House.
        </h1>
        <p className="mt-4 max-w-lg text-body text-slate">
          Each fragrance in the series tells a different story. Find yours.
        </p>
      </Container>
    </section>
  )
}
