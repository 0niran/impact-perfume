'use client'

import { useEffect, useRef, useState } from 'react'
import { useRegion } from '@/lib/regionContext'
import type { RegionId } from '@/lib/region'
import { cn } from '@/lib/cn'

export default function RegionSwitcher() {
  const { region, setRegion, availableRegions } = useRegion()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function pickRegion(id: RegionId) {
    setRegion(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-label uppercase tracking-[0.08em] text-stone hover:text-bone transition-colors"
      >
        <span aria-hidden="true">{region.countryCode === 'NG' ? '🇳🇬' : '🇨🇦'}</span>
        <span>{region.countryCode} · {region.currency}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-56 border border-stone/30 bg-ink shadow-lg"
        >
          {availableRegions.map((r) => {
            const isActive = r.id === region.id
            return (
              <button
                key={r.id}
                role="option"
                aria-selected={isActive}
                onClick={() => pickRegion(r.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 border-b border-stone/15 px-4 py-3 text-left transition-colors last:border-b-0',
                  isActive ? 'bg-mist/50' : 'hover:bg-mist/30'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="text-base">
                    {r.countryCode === 'NG' ? '🇳🇬' : '🇨🇦'}
                  </span>
                  <span>
                    <span className="block text-small text-bone">{r.name}</span>
                    <span className="block text-label text-stone">
                      {r.currency}
                      {!r.checkoutEnabled && ' · launching soon'}
                    </span>
                  </span>
                </span>
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-accent">
                    <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
