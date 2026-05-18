'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { SearchResult } from '@/app/api/search/route'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActiveIdx(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setActiveIdx(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    search(e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      router.push(results[activeIdx].href)
      onClose()
    }
  }

  if (!open) return null

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  let globalIdx = -1

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative bg-ink border border-stone/20 shadow-xl mx-auto w-full max-w-2xl mt-[72px] flex flex-col max-h-[calc(100vh-100px)]">
        {/* Input row */}
        <div className="flex items-center border-b border-stone/20 px-5 h-14">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden className="shrink-0 text-stone">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            aria-label="Search products"
            placeholder="Search products…"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="flex-1 ml-3 bg-transparent text-body text-bone placeholder:text-stone focus:outline-none"
            autoComplete="off"
          />
          <button
            onClick={onClose}
            className="ml-3 text-label uppercase tracking-[0.08em] text-stone hover:text-bone transition-colors"
          >
            Close
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto">
          {loading && (
            <p className="px-5 py-4 text-small text-stone">Searching…</p>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-body text-bone">No results for <em>&ldquo;{query}&rdquo;</em></p>
              <p className="mt-2 text-small text-stone">Try a number, scent family, or descriptor.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <p className="px-5 py-2 text-label uppercase tracking-[0.1em] text-stone bg-stone/10">
                    {category}
                  </p>
                  {items.map((result) => {
                    globalIdx++
                    const idx = globalIdx
                    return (
                      <Link
                        key={result.handle}
                        href={result.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-4 px-5 py-3 transition-colors duration-100',
                          activeIdx === idx ? 'bg-stone/10' : 'hover:bg-stone/10'
                        )}
                      >
                        <span
                          className="h-9 w-9 shrink-0"
                          style={{ backgroundColor: result.signatureColor }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-body text-bone truncate">{result.title}</p>
                          {result.descriptor && (
                            <p className="text-small text-stone truncate">{result.descriptor}</p>
                          )}
                        </div>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          aria-hidden
                          className="ml-auto shrink-0 text-stone"
                        >
                          <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Default state */}
          {query.length < 2 && !loading && (
            <div className="px-5 py-6">
              <p className="text-small text-stone mb-4 uppercase tracking-[0.08em]">Quick links</p>
              <div className="flex flex-wrap gap-2">
                {['No. 1', 'No. 7', 'Oud', 'Fruity', 'Woody', 'Oils', 'Discovery Set'].map((term) => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); search(term) }}
                    className="border border-stone/30 px-3 py-1.5 text-small text-bone hover:border-accent hover:text-accent transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
