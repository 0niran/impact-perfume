import { Container } from '@/components/layout'

const PILLARS = [
  {
    label: 'A House of Fragrance',
    body: 'Born in Lagos. From the Number Series to our Signature line, every creation is a statement. Never a trend. Always an impression.',
  },
  {
    label: 'Built for African Heat',
    body: 'A few drops of our concentrated oils last up to 48 hours. Every formula is tuned for humidity, warmth, and skin that radiates.',
  },
  {
    label: 'The House Promise',
    body: '"Even an enemy will appreciate the gift of a good-smelling perfume." We hold every batch to that standard.',
  },
]

export default function HousePositioningStrip() {
  return (
    <section className="border-y border-stone/20 bg-bone py-12 md:py-16">
      <Container>
        <dl className="grid gap-10 md:grid-cols-3 md:gap-12">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.label}
              className={
                i < PILLARS.length - 1
                  ? 'md:border-r md:border-stone/20 md:pr-12'
                  : ''
              }
            >
              <dt className="text-label uppercase tracking-[0.1em] text-accent">
                {pillar.label}
              </dt>
              <dd className="mt-3 text-body text-slate">{pillar.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
