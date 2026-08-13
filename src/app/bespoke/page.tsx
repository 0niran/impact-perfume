import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Container } from '@/components/layout'
import { getBespokeConfig } from '@/lib/bespokeConfig'

// Lazy-load: the configurator is a client bundle (form state) that only
// matters when a visitor lands on /bespoke.
const BespokeConfigurator = dynamic(
  () => import('@/components/bespoke/BespokeConfigurator'),
  { loading: () => <div className="py-20 text-center text-stone">Loading…</div> }
)

export const metadata: Metadata = {
  title: 'Bespoke',
  description:
    'Design your own Impact fragrance. Choose the bottle, the scent, the inscription. Made for you.',
  openGraph: {
    title: 'Bespoke · Impact Perfumes',
    description: 'Design your own Impact fragrance bottle. Bespoke composition, signature presentation.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function BespokePage() {
  // Prices and rates come from Medusa (draft config products) so nothing is
  // hardcoded. If Medusa is unreachable the configurator shows the quote path.
  const config = await getBespokeConfig()

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink py-16 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Bespoke</p>
          <h1 className="mt-3 max-w-3xl font-display text-display-l leading-none text-bone">
            Composed for you.
            <br />
            From bottle to base note.
          </h1>
          <p className="mt-5 max-w-xl text-body text-stone">
            Build your own Impact fragrance. Pick the bottle, the signature
            color, and the inscription, or start with a Number from our existing
            collection. Design it here; a real perfumer takes it from there.
          </p>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-b border-stone/20 bg-mist/40 py-10">
        <Container className="grid gap-6 sm:grid-cols-3">
          {[
            { step: '01', heading: 'Design', body: 'Configure your bottle, scent, and inscription.' },
            { step: '02', heading: 'Brief', body: 'Submit your composition. Our perfumer reviews and confirms within 24h.' },
            { step: '03', heading: 'Craft', body: 'Pay a deposit to secure your slot. Final price confirmed before production.' },
          ].map((s) => (
            <div key={s.step}>
              <p className="text-label uppercase tracking-[0.1em] text-accent">{s.step}</p>
              <p className="mt-2 font-display text-h3 text-bone">{s.heading}</p>
              <p className="mt-1 text-small text-stone">{s.body}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* Configurator */}
      <section className="bg-ink py-12 md:py-20">
        <Container>
          <BespokeConfigurator config={config} />
        </Container>
      </section>
    </>
  )
}
