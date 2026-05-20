import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/layout'

export const metadata: Metadata = {
  title: 'Order Confirmed · Impact Perfumes',
}

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: { ref?: string }
}) {
  const { ref } = searchParams

  return (
    <div className="bg-ink min-h-screen">
    <Container className="flex flex-col items-center py-24 text-center">
      <div className="mb-8 flex h-16 w-16 items-center justify-center border border-stone/30 text-accent">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="font-display text-h1 text-bone">Order Confirmed</h1>

      <p className="mt-4 max-w-md text-body text-stone">
        Thank you. Your payment was received successfully.
        We&apos;ll be in touch with delivery details shortly.
      </p>

      {ref && (
        <p className="mt-6 text-small text-stone">
          Reference: <span className="font-mono text-accent">{ref}</span>
        </p>
      )}

      <div className="mt-12 flex flex-col items-center gap-4">
        <Link
          href="/no-series"
          className="inline-flex h-[52px] items-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink transition-opacity hover:opacity-90"
        >
          Continue Shopping
        </Link>
        <Link href="/" className="text-small text-stone underline-offset-2 hover:underline">
          Back to home
        </Link>
      </div>
    </Container>
    </div>
  )
}
