import Container from '@/components/layout/Container'

const TESTIMONIALS = [
  {
    quote: "I've never had so many compliments in my life. No. 7 is something else.",
    author: 'A. Okoye',
  },
  {
    quote: "The longevity is insane. One spray in the morning and I'm still getting noticed at 10pm.",
    author: 'E. Thomas',
  },
  {
    quote: 'This is what luxury should smell like. Impact No. 3 is my signature now.',
    author: 'C. Adams',
  },
]

export default function TestimonialStrip() {
  return (
    <section className="bg-ink py-20 md:py-32">
      <Container>
        <div className="mb-14 flex items-center gap-4">
          <div className="h-px flex-1 bg-stone/20" />
          <p className="text-label uppercase tracking-[0.16em] text-stone shrink-0">
            Worn the world over
          </p>
          <div className="h-px flex-1 bg-stone/20" />
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className="flex flex-col gap-4">
              <span className="font-display text-[56px] leading-none text-accent/25 select-none -mb-2" aria-hidden="true">
                &ldquo;
              </span>
              <p className="font-display text-[20px] leading-relaxed italic text-bone/90">
                {t.quote}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="h-px w-6 bg-accent/50" />
                <p className="text-small text-stone">
                  {t.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
