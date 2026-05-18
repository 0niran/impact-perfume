import type { Metadata } from 'next'
import { Container } from '@/components/layout'
import B2BForm from '@/components/b2b/B2BForm'

export const metadata: Metadata = {
  title: 'B2B & Gifting',
  description:
    'Partner with Impact Perfumes for bespoke bottles, hotel scenting, corporate gifting, and retail partnerships.',
}

const OFFERINGS = [
  {
    title: 'Bespoke Bottles',
    body: 'Custom fragrances for your brand, hotel, or event, built on the Impact Number Series foundation with your own label and scent profile.',
  },
  {
    title: 'Hotel & Spa Scenting',
    body: 'Ambient scenting programmes for hospitality spaces. We supply our diffuser concentrates in bulk and advise on diffusion schedules.',
  },
  {
    title: 'Corporate Gifting',
    body: 'Curated gift sets from the Number Series, packaged to your specification. Minimum order 20 units. Delivery nationwide.',
  },
  {
    title: 'Retail Partnerships',
    body: 'Stocking Impact Perfumes in your store? We work with select retail partners on consignment and wholesale terms.',
  },
]

export default function B2BPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-bone">
        <Container className="py-20 md:py-28">
          <p className="text-label uppercase tracking-[0.12em] text-stone">
            Trade & Partnerships
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-display-l leading-none text-balance">
            The scent your guests will remember.
          </h1>
          <p className="mt-6 max-w-lg text-body-l text-stone">
            We work with hotels, spas, retailers, and brands who understand that fragrance
            is the most powerful memory trigger in the room.
          </p>
        </Container>
      </section>

      {/* Offerings grid */}
      <section className="border-b border-stone/20 bg-ink">
        <Container className="py-14">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {OFFERINGS.map((o) => (
              <div key={o.title}>
                <h2 className="font-display text-h3 text-bone">{o.title}</h2>
                <p className="mt-3 text-body text-stone">{o.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Form */}
      <section className="bg-ink">
        <Container className="py-16 md:py-20">
          <div className="grid gap-16 lg:grid-cols-[1fr_560px]">
            {/* Left, context */}
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-accent">
                Get in touch
              </p>
              <h2 className="mt-3 font-display text-h1 text-bone">
                Start a conversation.
              </h2>
              <p className="mt-4 max-w-sm text-body text-stone">
                Fill in the form and we&apos;ll respond within 24 hours with pricing,
                samples, and next steps.
              </p>

              <div className="mt-10 flex flex-col gap-4 border-t border-stone/20 pt-8">
                <div>
                  <p className="text-label uppercase tracking-[0.08em] text-stone">Email</p>
                  <a
                    href="mailto:hello@impactperfumes.com"
                    className="mt-1 block text-body hover:text-accent transition-colors"
                  >
                    hello@impactperfumes.com
                  </a>
                </div>
                <div>
                  <p className="text-label uppercase tracking-[0.08em] text-stone">
                    Based in
                  </p>
                  <p className="mt-1 text-body">Lagos, Nigeria</p>
                </div>
              </div>
            </div>

            {/* Right, form */}
            <B2BForm />
          </div>
        </Container>
      </section>
    </>
  )
}
