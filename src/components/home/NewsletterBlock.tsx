'use client'

import { useState } from 'react'
import { Container } from '@/components/layout'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function NewsletterBlock() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || status === 'loading') return
    setStatus('loading')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setStatus(data.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="bg-ink py-16 text-bone md:py-24">
      <Container className="flex flex-col items-center text-center">
        <p className="text-label uppercase tracking-[0.12em] text-stone">
          Stay in the loop
        </p>
        <h2 className="mt-4 font-display text-h1 md:text-display-l">
          Be first. Always.
        </h2>
        <p className="mt-4 max-w-md text-body text-stone">
          New numbers, limited editions, and stories from the house, straight to you.
        </p>

        {status === 'success' ? (
          <p className="mt-10 text-body-l font-display italic">
            You&apos;re in. Watch your inbox.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              aria-label="Email address"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border border-stone/30 bg-transparent px-5 py-3 text-bone placeholder:text-stone/50 focus:border-stone focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="shrink-0 bg-accent px-8 py-3 text-label uppercase tracking-[0.1em] text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {status === 'loading' ? 'Sending…' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-3 text-small text-error">
            Something went wrong. Please try again.
          </p>
        )}
      </Container>
    </section>
  )
}
