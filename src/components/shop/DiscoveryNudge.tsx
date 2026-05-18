import Link from 'next/link'
import { Container } from '@/components/layout'

export default function DiscoveryNudge() {
  return (
    <section className="border-t border-stone/20 bg-ink py-10">
      <Container className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-label uppercase tracking-[0.1em] text-accent">
            Not sure where to start?
          </p>
          <p className="mt-1 font-display text-h2 text-bone">
            Try a Discovery Set. Sample five Numbers before you commit.
          </p>
        </div>
        <Link
          href="/gifts"
          className="shrink-0 inline-flex items-center justify-center bg-accent px-8 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
          style={{ height: 48 }}
        >
          Shop Discovery Set
        </Link>
      </Container>
    </section>
  )
}
