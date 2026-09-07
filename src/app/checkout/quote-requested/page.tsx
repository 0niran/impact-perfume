import type { Metadata } from 'next'
import { Container } from '@/components/layout'
import QuoteRequested from '@/components/checkout/QuoteRequested'

export const metadata: Metadata = {
  title: 'Shipping quote requested',
  // A confirmation page has no business in search results.
  robots: { index: false, follow: false },
}

export default function QuoteRequestedPage() {
  return (
    <div className="bg-ink min-h-screen">
      <Container className="py-12 md:py-20">
        <div className="mb-8">
          <p className="text-label uppercase tracking-[0.14em] text-bone/40">Request Received</p>
        </div>
        <QuoteRequested />
      </Container>
    </div>
  )
}
