import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom doesn't ship IntersectionObserver — stub it for components that
// use it (eg. AddToCart's sticky mobile bar).
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
;(global as unknown as { IntersectionObserver: typeof IntersectionObserverStub }).IntersectionObserver =
  IntersectionObserverStub

// Reset DOM between tests
afterEach(() => {
  cleanup()
})

// Stub localStorage between tests so persistence-based stores reset cleanly
afterEach(() => {
  window.localStorage.clear()
})

// Stub fetch by default so tests don't accidentally hit the network
beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})
