'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'impact-recently-viewed-v1'
const MAX_ITEMS = 8

export interface RecentlyViewedItem {
  handle: string
  href: string
  title: string
  subtitle?: string
  imageUrl?: string
  signatureColor?: string
}

function read(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function write(items: RecentlyViewedItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    /* quota or privacy mode — ignore */
  }
}

/**
 * Returns the list of recently-viewed items + a `track` function to
 * append/promote one. The hook hydrates lazily so SSR returns an empty
 * list; first client render fills from localStorage.
 */
export function useRecentlyViewed(): {
  items: RecentlyViewedItem[]
  track: (item: RecentlyViewedItem) => void
} {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])

  useEffect(() => {
    setItems(read())
  }, [])

  const track = useCallback((item: RecentlyViewedItem) => {
    setItems((prev) => {
      const without = prev.filter((p) => p.handle !== item.handle)
      const next = [item, ...without].slice(0, MAX_ITEMS)
      write(next)
      return next
    })
  }, [])

  return { items, track }
}
