import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentlyViewedRail } from '../RecentlyViewed'

const STORAGE_KEY = 'impact-recently-viewed-v1'

function seedStorage(items: Array<{ handle: string; href: string; title: string; subtitle?: string; imageUrl?: string; signatureColor?: string }>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('RecentlyViewedRail — exclusion logic', () => {
  it('renders nothing when storage is empty', () => {
    const { container } = render(<RecentlyViewedRail />)
    // Nothing visible because filtered list is empty after mount
    // (the rail returns null when filtered.length === 0)
    expect(container.querySelector('section, div')).toBeNull()
  })

  it('renders all items when no exclusion is provided', async () => {
    seedStorage([
      { handle: 'no-1', href: '/no/1', title: 'Impact No. 1' },
      { handle: 'no-2', href: '/no/2', title: 'Impact No. 2' },
    ])
    render(<RecentlyViewedRail />)
    expect(await screen.findByText('Impact No. 1')).toBeInTheDocument()
    expect(screen.getByText('Impact No. 2')).toBeInTheDocument()
  })

  it('excludes the current product via excludeHandle', async () => {
    seedStorage([
      { handle: 'no-1', href: '/no/1', title: 'Impact No. 1' },
      { handle: 'no-2', href: '/no/2', title: 'Impact No. 2' },
    ])
    render(<RecentlyViewedRail excludeHandle="no-1" />)
    expect(await screen.findByText('Impact No. 2')).toBeInTheDocument()
    expect(screen.queryByText('Impact No. 1')).not.toBeInTheDocument()
  })

  it('excludes multiple items via excludeHandles', async () => {
    seedStorage([
      { handle: 'no-1', href: '/no/1', title: 'Impact No. 1' },
      { handle: 'no-2', href: '/no/2', title: 'Impact No. 2' },
      { handle: 'no-3', href: '/no/3', title: 'Impact No. 3' },
    ])
    render(<RecentlyViewedRail excludeHandles={['no-1', 'no-2']} />)
    expect(await screen.findByText('Impact No. 3')).toBeInTheDocument()
    expect(screen.queryByText('Impact No. 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Impact No. 2')).not.toBeInTheDocument()
  })

  it('combines excludeHandle and excludeHandles', async () => {
    seedStorage([
      { handle: 'no-1', href: '/no/1', title: 'Impact No. 1' },
      { handle: 'no-2', href: '/no/2', title: 'Impact No. 2' },
      { handle: 'no-3', href: '/no/3', title: 'Impact No. 3' },
    ])
    render(<RecentlyViewedRail excludeHandle="no-1" excludeHandles={['no-2']} />)
    expect(await screen.findByText('Impact No. 3')).toBeInTheDocument()
    expect(screen.queryByText('Impact No. 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Impact No. 2')).not.toBeInTheDocument()
  })

  it('returns null when filtered list is empty (everything excluded)', () => {
    seedStorage([
      { handle: 'no-1', href: '/no/1', title: 'Impact No. 1' },
    ])
    const { container } = render(<RecentlyViewedRail excludeHandle="no-1" />)
    expect(container.textContent).toBe('')
  })

  it('caps at 4 items (drawer variant)', async () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      handle: `no-${i + 1}`,
      href: `/no/${i + 1}`,
      title: `Impact No. ${i + 1}`,
    }))
    seedStorage(items)
    render(<RecentlyViewedRail variant="drawer" />)
    const links = await screen.findAllByRole('link')
    expect(links.length).toBe(4)
  })
})
