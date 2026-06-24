import { Container } from '@/components/layout'

const PILLARS = [
  {
    numeral: 'I',
    label: 'A House of Fragrance',
    body: 'From the Number Series to Signature Scents, every creation is a statement. Never a trend. Always an impression.',
  },
  {
    numeral: 'II',
    label: 'Built to Last',
    body: 'A few drops of our concentrated oils last up to 48 hours. Every formula is tuned for warmth, longevity, and skin that radiates.',
  },
  {
    numeral: 'III',
    label: 'The House Promise',
    body: '"Even an enemy will appreciate the gift of a good-smelling perfume." We hold every batch to that standard.',
  },
]

export default function HousePositioningStrip() {
  return (
    <section className="bg-ink py-16 md:py-24 border-y border-stone/20">
      <Container>
        <dl className="grid gap-12 md:grid-cols-3 md:gap-16">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.label}
              className={
                i < PILLARS.length - 1
                  ? 'md:border-r md:border-stone/20 md:pr-16'
                  : ''
              }
            >
              <span className="font-display text-[40px] leading-none text-accent/40 select-none">
                {pillar.numeral}
              </span>
              <dt className="mt-4 text-label uppercase tracking-[0.12em] text-bone/50">
                {pillar.label}
              </dt>
              <dd className="mt-3 text-body leading-relaxed text-bone/70">{pillar.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
