import Container from '@/components/layout/Container'

const TESTIMONIALS = [
  {
    quote: "I've never had so many compliments in my life. No. 7 is something else.",
    author: 'Adaeze O.',
    location: 'Lagos',
  },
  {
    quote: "The longevity is insane. One spray in the morning and I'm still getting noticed at 10pm.",
    author: 'Emeka T.',
    location: 'Abuja',
  },
  {
    quote: 'This is what luxury should smell like. Impact No. 3 is my signature now.',
    author: 'Chisom A.',
    location: 'Port Harcourt',
  },
]

export default function TestimonialStrip() {
  return (
    <section className="border-t border-stone/20 bg-ink py-20 md:py-24">
      <Container>
        <p className="text-label uppercase tracking-[0.12em] text-stone text-center mb-12">
          Worn across Nigeria
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className="flex flex-col gap-4">
              {/* Stars */}
              <div className="flex gap-1" aria-label="5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M6 1l1.236 2.507L10 3.93l-2 1.95.472 2.754L6 7.315l-2.472 1.32L4 5.88 2 3.93l2.764-.423L6 1z"
                      fill="#C4972A"
                    />
                  </svg>
                ))}
              </div>

              <p className="font-display text-h3 italic leading-snug text-bone">
                &ldquo;{t.quote}&rdquo;
              </p>

              <p className="text-small text-stone">
                {t.author} · {t.location}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
