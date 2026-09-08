import type { ReactNode } from 'react'
import Container from '@/components/layout/Container'

/**
 * Shared shell for the policy pages.
 *
 * Both are long, structured documents rather than marketing pages, so they get
 * a narrower measure than the rest of the site and a persistent contents list.
 * Sharing the shell is also what stops the two drifting apart the way the
 * product pages did.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  /** ISO date. Rendered readably, and machine-readable for the crawler. */
  updated: string
  intro: ReactNode
  sections: { id: string; heading: string; body: ReactNode }[]
}) {
  const updatedLabel = new Date(updated).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="bg-ink text-bone">
      <section className="border-b border-stone/20 py-20 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-stone">Legal</p>
          <h1 className="mt-4 font-display text-display-l leading-none text-bone">{title}</h1>
          <p className="mt-5 text-small text-stone">
            Last updated <time dateTime={updated}>{updatedLabel}</time>
          </p>
          <div className="mt-8 max-w-2xl text-body text-stone">{intro}</div>
        </Container>
      </section>

      <Container className="py-14 md:py-20">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* Contents. Sticky on desktop so a long document stays navigable. */}
          <nav aria-label="Contents" className="mb-12 lg:mb-0 lg:sticky lg:top-28 lg:self-start">
            <p className="text-label uppercase tracking-[0.1em] text-accent">Contents</p>
            <ol className="mt-5 flex flex-col gap-2.5">
              {sections.map((s, i) => (
                <li key={s.id} className="flex gap-3">
                  <span className="text-small tabular-nums text-stone/60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <a
                    href={`#${s.id}`}
                    className="text-small text-stone hover:text-bone transition-colors"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-2xl">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className={i === 0 ? '' : 'mt-12 border-t border-stone/15 pt-12'}
              >
                <h2 className="font-display text-h2 leading-snug text-bone">{s.heading}</h2>
                <div className="mt-5 flex flex-col gap-4 text-body text-stone">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}

/** Definition row, for the tables of data and recipients. */
export function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-stone/12 py-3 sm:grid-cols-[190px_1fr] sm:gap-6">
      <dt className="text-small font-medium text-bone">{term}</dt>
      <dd className="text-small text-stone">{children}</dd>
    </div>
  )
}
