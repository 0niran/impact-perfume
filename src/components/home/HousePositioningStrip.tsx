import { Container } from '@/components/layout'

const PILLARS = [
  {
    numeral: 'I',
    label: 'A House of Fragrance',
    body: 'Born in Lagos. From the Number Series to our Signature line, every creation is a statement. Never a trend. Always an impression.',
  },
  {
    numeral: 'II',
    label: 'Built for African Heat',
    body: 'A few drops of our concentrated oils last up to 48 hours. Every formula is tuned for humidity, warmth, and skin that radiates.',
  },
  {
    numeral: 'III',
    label: 'The House Promise',
    body: '"Even an enemy will appreciate the gift of a good-smelling perfume." We hold every batch to that standard.',
  },
]

export default function HousePositioningStrip() {
  return (
    <section className="bg-cream py-16 md:py-24">
      <Container>
        <dl className="grid gap-12 md:grid-cols-3 md:gap-16">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.label}
              className={
                i < PILLARS.length - 1
                  ? 'md:border-r md:border-ink/10 md:pr-16'
                  : ''
              }
            >
              <span className="font-display text-[40px] leading-none text-accent/30 select-none">
                {pillar.numeral}
              </span>
              <dt className="mt-4 text-label uppercase tracking-[0.12em] text-ink/50">
                {pillar.label}
              </dt>
              <dd className="mt-3 text-body leading-relaxed text-ink/70">{pillar.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
