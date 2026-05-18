'use client'

import { cn } from '@/lib/cn'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'number-asc', label: 'Number: Low–High' },
  { value: 'number-desc', label: 'Number: High–Low' },
  { value: 'family-az', label: 'Family: A–Z' },
]

interface ResultsHeaderProps {
  count: number
  total: number
  sort: string
  onSort: (sort: string) => void
  onOpenSheet: () => void
  activeFamily: string | null
  onClearFamily: () => void
}

export default function ResultsHeader({
  count,
  total,
  sort,
  onSort,
  onOpenSheet,
  activeFamily,
  onClearFamily,
}: ResultsHeaderProps) {
  return (
    <div className="sticky top-16 z-10 border-b border-stone/20 bg-ink/95 backdrop-blur-sm">
      <div className="flex items-center gap-4 px-0 py-3">
        {/* Mobile filter button */}
        <button
          onClick={onOpenSheet}
          className="flex items-center gap-2 border border-stone/30 px-4 py-2 text-label uppercase tracking-[0.1em] text-stone hover:border-accent hover:text-bone transition-colors duration-150 lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Filter
          {activeFamily && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-ink">
              1
            </span>
          )}
        </button>

        {/* Active filter chip */}
        {activeFamily && (
          <button
            onClick={onClearFamily}
            className="hidden lg:flex items-center gap-2 border border-accent px-3 py-1.5 text-label text-accent hover:opacity-80 transition-opacity"
          >
            {activeFamily}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        <p className="text-small text-stone">
          {count === total ? `${total} fragrances` : `${count} of ${total}`}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort-select" className="hidden text-small text-stone sm:block">
            Sort:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className={cn(
              'border-0 bg-transparent text-small text-bone focus:outline-none cursor-pointer',
              'appearance-none pr-5'
            )}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235A554E' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0 center',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
