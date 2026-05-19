'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { useRegion } from '@/lib/regionContext'
import type { RegionId } from '@/lib/region'

interface MobileMenuDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const sections = [
  {
    title: 'Number Collection',
    links: [
      { label: 'Shop All', href: '/shop' },
      { label: 'By Scent Family', href: '/shop' },
    ],
  },
  {
    title: 'Signature',
    links: [
      { label: 'Signature Collection', href: '/signature' },
    ],
  },
  {
    title: 'Oils',
    links: [
      { label: 'Impact Oils', href: '/oils' },
    ],
  },
  {
    title: 'Home & Car',
    links: [
      { label: 'Shop All', href: '/home' },
      { label: 'Home Diffusers', href: '/home#home-diffusers' },
      { label: 'Scent Candles', href: '/home#scent-candles' },
      { label: 'Scenting Machines', href: '/home#scenting-machines' },
      { label: 'Car Diffusers', href: '/home#car-diffusers' },
    ],
  },
  {
    title: 'Gift',
    links: [
      { label: 'All Gift Sets', href: '/gifts#gift-sets' },
    ],
  },
  {
    title: 'Discovery',
    links: [
      { label: 'Number Series Discovery', href: '/gifts#discovery-sets' },
      { label: 'Signature Discovery', href: '/gifts#discovery-sets' },
      { label: 'Fragrance Finder', href: '/quiz' },
    ],
  },
  {
    title: 'Our Story',
    links: [
      { label: 'House Story', href: '/house-story' },
      { label: 'Bespoke', href: '/bespoke' },
      { label: 'B2B', href: '/b2b' },
      { label: 'Journal', href: '/journal' },
    ],
  },
]

export default function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const { region, setRegion, availableRegions } = useRegion()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  function pickRegion(id: RegionId) {
    setRegion(id)
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-ink flex flex-col',
          'transition-transform duration-300 ease-soft lg:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-stone/20 shrink-0">
          <Link
            href="/"
            onClick={onClose}
            className="block"
            aria-label="Impact Perfumes, home"
          >
            <Image
              src="/images/Logo.png"
              alt="Impact Perfumes"
              width={181}
              height={121}
              className="h-9 w-auto"
            />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex items-center justify-center w-8 h-8 text-bone"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Region switcher */}
        <div className="border-b border-stone/20 px-6 py-4 shrink-0">
          <p className="text-label uppercase tracking-[0.08em] text-stone mb-2">Shipping to</p>
          <div className="flex gap-2">
            {availableRegions.map((r) => {
              const isActive = r.id === region.id
              return (
                <button
                  key={r.id}
                  onClick={() => pickRegion(r.id)}
                  className={cn(
                    'flex-1 border px-3 py-2 text-left transition-colors',
                    isActive
                      ? 'border-accent bg-accent/5'
                      : 'border-stone/30 hover:border-stone'
                  )}
                >
                  <span className="block text-small text-bone">
                    {r.countryCode === 'NG' ? '🇳🇬' : '🇨🇦'} {r.name}
                  </span>
                  <span className="block text-label text-stone">
                    {r.currency}
                    {!r.checkoutEnabled && ' · soon'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto" aria-label="Main navigation">
          {sections.map((section) => (
            <details key={section.title} className="group border-b border-stone/20">
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none select-none text-label uppercase tracking-[0.08em] text-bone">
                {section.title}
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden
                  className="shrink-0 transition-transform duration-200 group-open:rotate-180"
                >
                  <path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </summary>
              <ul className="px-6 pb-5 space-y-4">
                {section.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="text-body text-stone hover:text-bone transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-8 border-t border-stone/20 shrink-0 flex flex-col gap-4">
          <Link
            href="/gifts"
            onClick={onClose}
            className="inline-flex items-center justify-center bg-accent px-6 text-label uppercase tracking-[0.08em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 44 }}
          >
            Shop Gifts
          </Link>
          <Link
            href="/b2b"
            onClick={onClose}
            className="text-label uppercase tracking-[0.08em] text-stone hover:text-bone transition-colors text-center"
          >
            B2B / Bespoke
          </Link>
        </div>
      </div>
    </>
  )
}
