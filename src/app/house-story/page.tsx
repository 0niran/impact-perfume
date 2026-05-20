import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/layout'
import { SITE_CONFIG } from '@/lib/config'

export const metadata: Metadata = {
  title: 'House Story | Impact Perfumes',
  description:
    'The story behind Impact Perfumes, a Lagos-based luxury fragrance house crafting scents that leave a mark.',
  openGraph: {
    title: 'House Story | Impact Perfumes',
    description: 'Crafted in Lagos. Composed for character.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default function HouseStoryPage() {
  return (
    <main className="bg-ink text-bone">

      {/* Hero */}
      <section className="bg-ink py-24 md:py-32 text-bone">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-stone">
            The House of Impact
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-display-l md:text-display-xl leading-none text-balance">
            Crafted in Lagos.
            <br />
            Composed for character.
          </h1>
        </Container>
      </section>

      {/* Brand origin */}
      <section className="border-t border-stone/20 bg-ink py-20 md:py-28">
        <Container>
          <div className="grid gap-16 md:grid-cols-2 md:items-start">
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-accent mb-6">
                Our Brand
              </p>
              <p className="font-display text-h2 leading-snug text-bone">
                We go far &amp; wide to bring together class and value.
              </p>
            </div>
            <div className="flex flex-col gap-5 text-body text-stone">
              <p>
                At Impact Perfumes we go far &amp; wide to bring together class and
                value in specially produced bottles to provide scents that are simply
                unforgettable, created to give that unique and exotic oriental
                experience.
              </p>
              <p>
                One thing that guides our creations is that our bottles are going out
                there to make impact. From the choice of fragrances to the design of
                the bottle, our clients are always on our mind.
              </p>
              <p>
                Every fragrance we compose is built to linger, on skin, in memory,
                in the room long after you have left it. That is the standard we hold
                ourselves to with every number in the series and every named
                composition in the Signature Collection.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Founder quote */}
      <section className="border-t border-stone/20 bg-ink py-20 md:py-28">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="font-display text-h1 md:text-display-s italic leading-snug text-bone">
              &ldquo;Even an enemy will appreciate the gift of a good smelling perfume.&rdquo;
            </blockquote>
            <p className="mt-6 text-label uppercase tracking-[0.1em] text-stone">
              D.A. &nbsp;·&nbsp; CEO, Impact Perfumes
            </p>
          </div>
        </Container>
      </section>

      {/* Offerings */}
      <section className="border-t border-stone/20 bg-ink py-20 md:py-28">
        <Container>
          <p className="text-label uppercase tracking-[0.1em] text-accent mb-4">
            What We Offer
          </p>
          <h2 className="font-display text-h1 md:text-display-s leading-none mb-16 max-w-xl text-bone">
            Beyond the bottle.
          </h2>

          <div className="grid gap-px bg-stone/20 md:grid-cols-3">

            {/* Bespoke */}
            <div className="bg-ink p-8 md:p-10 flex flex-col gap-4">
              <p className="text-label uppercase tracking-[0.1em] text-accent">
                Bespoke Perfumes
              </p>
              <h3 className="font-display text-h2 leading-none">
                Your scent.<br />Your name on it.
              </h3>
              <p className="text-body text-stone flex-1">
                We create branded perfume bottles with colours and inscriptions of your
                choice. Souvenirs, corporate gifts, event favours, matted or polished,
                we make it happen to your exact brief.
              </p>
              <Link
                href="/b2b"
                className="inline-flex items-center text-label uppercase tracking-[0.08em] text-bone hover:text-accent transition-colors duration-150 mt-2"
              >
                Start an enquiry
              </Link>
            </div>

            {/* Scenting Solutions */}
            <div className="bg-ink p-8 md:p-10 flex flex-col gap-4">
              <p className="text-label uppercase tracking-[0.1em] text-accent">
                Scenting Solutions
              </p>
              <h3 className="font-display text-h2 leading-none">
                Fragrance for<br />every space.
              </h3>
              <p className="text-body text-stone flex-1">
                With our programmed scenting machines, we create a beautifully
                fragranced atmosphere, in your home, your office, hotel, store, or
                any commercial space. Ambient scenting that guests remember.
              </p>
              <Link
                href="/b2b"
                className="inline-flex items-center text-label uppercase tracking-[0.08em] text-bone hover:text-accent transition-colors duration-150 mt-2"
              >
                Enquire about scenting
              </Link>
            </div>

            {/* Partnerships */}
            <div className="bg-ink p-8 md:p-10 flex flex-col gap-4">
              <p className="text-label uppercase tracking-[0.1em] text-accent">
                Partnerships
              </p>
              <h3 className="font-display text-h2 leading-none">
                Built to grow<br />together.
              </h3>
              <p className="text-body text-stone flex-1">
                We work with retailers, hotels, spas, and lifestyle brands across
                Nigeria. Whether you want to stock Impact fragrances or co-create
                something entirely new, we are open to building the right relationship.
              </p>
              <Link
                href="/b2b"
                className="inline-flex items-center text-label uppercase tracking-[0.08em] text-bone hover:text-accent transition-colors duration-150 mt-2"
              >
                Explore partnerships
              </Link>
            </div>

          </div>
        </Container>
      </section>

      {/* Contact strip */}
      <section className="border-t border-stone/20 bg-ink py-16">
        <Container>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-label uppercase tracking-[0.1em] text-stone mb-1">
                Corporate Office
              </p>
              <p className="text-body text-stone">
                {SITE_CONFIG.contact.address.line1},{' '}
                {SITE_CONFIG.contact.address.line2}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <a
                href={`mailto:${SITE_CONFIG.contact.email}`}
                className="text-body text-stone hover:text-bone transition-colors"
              >
                {SITE_CONFIG.contact.email}
              </a>
              <a
                href={`tel:${SITE_CONFIG.contact.phone}`}
                className="text-body text-stone hover:text-bone transition-colors"
              >
                {SITE_CONFIG.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="bg-ink py-20 text-center text-bone">
        <Container>
          <h2 className="font-display text-h1 md:text-display-s">
            Explore the Collection
          </h2>
          <p className="mt-4 text-body text-bone/70 max-w-md mx-auto">
            Every Impact fragrance is a chapter. Find yours.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/no-series"
              className="inline-flex items-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90"
              style={{ height: 52 }}
            >
              Shop the Number Series
            </Link>
            <Link
              href="/b2b"
              className="inline-flex items-center border border-bone/30 px-10 text-label uppercase tracking-[0.1em] text-bone transition-opacity hover:opacity-80"
              style={{ height: 52 }}
            >
              B2B Enquiry
            </Link>
          </div>
        </Container>
      </section>

    </main>
  )
}
