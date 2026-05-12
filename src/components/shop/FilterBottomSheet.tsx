'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { SCENT_FAMILIES } from '@/lib/constants'

interface FilterBottomSheetProps {
  open: boolean
  onClose: () => void
  activeFamily: string | null
  onApply: (family: string | null) => void
}

export default function FilterBottomSheet({
  open,
  onClose,
  activeFamily,
  onApply,
}: FilterBottomSheetProps) {
  const [pendingFamily, setPendingFamily] = useState<string | null>(activeFamily)

  useEffect(() => {
    setPendingFamily(activeFamily)
  }, [activeFamily, open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter fragrances"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-bone transition-transform duration-300 ease-soft',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '85dvh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="sticky top-0 flex items-center justify-between border-b border-stone/20 bg-bone px-6 py-4">
          <p className="text-label uppercase tracking-[0.1em]">Filters</p>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="text-slate hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="text-label uppercase tracking-[0.1em] text-ink">Scent Family</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setPendingFamily(null)}
              className={cn(
                'border px-4 py-2 text-small transition-colors duration-150',
                !pendingFamily
                  ? 'border-ink bg-ink text-bone'
                  : 'border-stone/40 text-slate hover:border-ink hover:text-ink'
              )}
            >
              All
            </button>
            {SCENT_FAMILIES.map((family) => (
              <button
                key={family}
                onClick={() =>
                  setPendingFamily(pendingFamily === family ? null : family)
                }
                className={cn(
                  'border px-4 py-2 text-small transition-colors duration-150',
                  pendingFamily === family
                    ? 'border-ink bg-ink text-bone'
                    : 'border-stone/40 text-slate hover:border-ink hover:text-ink'
                )}
              >
                {family}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-stone/20 bg-bone px-6 py-4">
          <button
            onClick={() => { setPendingFamily(null); onApply(null) }}
            className="flex-1 border border-stone/40 py-3 text-label uppercase tracking-[0.1em] text-slate hover:border-ink hover:text-ink transition-colors duration-150"
          >
            Clear
          </button>
          <button
            onClick={() => onApply(pendingFamily)}
            className="flex-1 bg-ink py-3 text-label uppercase tracking-[0.1em] text-bone hover:opacity-90 transition-opacity duration-150"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}
