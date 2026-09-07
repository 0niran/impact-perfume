'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import MegaMenu from './MegaMenu'
import MobileMenuDrawer from './MobileMenuDrawer'
import SearchOverlay from './SearchOverlay'
import RegionSwitcher from './RegionSwitcher'
import { useCartStore, cartSelectors } from '@/store/cartStore'
import { useRegion } from '@/lib/regionContext'
import { formatPrice as formatPriceByCurrency } from '@/lib/format'

type MenuKey = 'series' | 'homeGifts' | 'discover'

export default function SiteHeader() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemCount = useCartStore(cartSelectors.itemCount)
  const setCartOpen = useCartStore((s) => s.setOpen)
  const { region } = useRegion()
  const freeDeliveryDisplay = formatPriceByCurrency(region.freeDeliveryThresholdMinor, region.currency)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const openMenu = useCallback((key: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(key)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 150)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-500',
          scrolled || !isHomepage
            ? 'bg-ink shadow-[0_1px_0_0_rgba(228_178_80_/_0.15)]'
            : 'bg-transparent'
        )}
      >
        {/* Utility bar, hides on scroll or on homepage hero */}
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300',
            scrolled || isHomepage ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'
          )}
        >
          <div className="container-px mx-auto max-w-container flex items-center justify-between h-9 border-b border-stone/20">
            <p className="text-label text-stone">
              Free delivery on orders over {freeDeliveryDisplay}
            </p>
            <RegionSwitcher />
          </div>
        </div>

        {/* Main row */}
        <div
          className={cn(
            'container-px mx-auto max-w-container relative flex items-center justify-between transition-[height] duration-200',
            scrolled ? 'h-16' : 'h-24'
          )}
        >
          {/* Menu, mobile only. It holds the left edge opposite the search/cart
              cluster so the centred medallion sits between balanced weights,
              which is also where a thumb expects the menu on a phone. */}
          <button
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center justify-center w-8 h-8 text-bone"
          >
            <HamburgerIcon />
          </button>

          {/* Left nav, desktop (3 items max to give logo breathing room) */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Primary navigation">
            <NavItem
              label="Number Series"
              href="/no-series"
              hasMenu
              isActive={activeMenu === 'series'}
              onMouseEnter={() => openMenu('series')}
              onMouseLeave={scheduleClose}
            />
            <Link
              href="/signature"
              className="text-label uppercase tracking-[0.08em] text-bone hover:text-accent transition-colors duration-150"
            >
              Signature Scents
            </Link>
            <Link
              href="/oils"
              className="text-label uppercase tracking-[0.08em] text-bone hover:text-accent transition-colors duration-150"
            >
              Perfume Oils
            </Link>
          </nav>

          {/* Logo medallion, left-aligned on mobile, absolutely centered on desktop.
              The mark is a circular crest whose wordmark sits in a band across the
              middle, so it only becomes readable at size — hence the larger
              footprint and the taller unscrolled bar that makes room for it. */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
            <Flourish side="left" hidden={scrolled} />

            <Link
              href="/"
              className="group relative block"
              aria-label="Impact Perfumes, home"
            >
              {/* Warm aura, so the crest reads as lit rather than pasted on */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-3 rounded-full opacity-70 blur-md transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(circle, rgba(228,178,80,0.25) 0%, transparent 70%)',
                }}
              />
              {/* Hairline gold ring, picking up the crest's own border */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-[3px] rounded-full border border-accent/25 transition-colors duration-300 group-hover:border-accent/60"
              />
              <Image
                src="/images/logo.svg"
                alt="Impact Perfumes"
                width={240}
                height={240}
                priority
                // Vector: nothing for the optimizer to do, and this avoids
                // having to enable dangerouslyAllowSVG for every remote image.
                unoptimized
                className={cn(
                  'relative w-auto rounded-full transition-[height] duration-300',
                  scrolled ? 'h-12' : 'h-16 sm:h-[4.5rem] lg:h-20'
                )}
              />
            </Link>

            <Flourish side="right" hidden={scrolled} />
          </div>

          {/* Right side, desktop: Home & Gifts + Our Story + icons, mobile: cart + hamburger.
              ml-auto keeps this hard right: the medallion is absolutely centred at
              every breakpoint, so on mobile this is the only in-flow child and
              justify-between alone would pull it to the left. */}
          <div className="ml-auto flex items-center gap-4 lg:gap-6">
            <NavItem
              label="Home & Gifts"
              href="/gifts"
              hasMenu
              isActive={activeMenu === 'homeGifts'}
              className="hidden lg:block"
              onMouseEnter={() => openMenu('homeGifts')}
              onMouseLeave={scheduleClose}
            />
            <NavItem
              label="Our Story"
              href="/house-story"
              hasMenu
              isActive={activeMenu === 'discover'}
              className="hidden lg:block"
              onMouseEnter={() => openMenu('discover')}
              onMouseLeave={scheduleClose}
            />

            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-8 h-8 text-bone hover:text-accent transition-colors duration-150"
            >
              <SearchIcon />
            </button>

            <button
              aria-label={`Cart${itemCount > 0 ? ` (${itemCount} item${itemCount > 1 ? 's' : ''})` : ''}`}
              onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center w-8 h-8 text-bone hover:text-accent transition-colors duration-150"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-[9px] font-bold text-ink leading-none">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mega menu */}
        {activeMenu && (
          <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
            <MegaMenu activeMenu={activeMenu} />
          </div>
        )}
      </header>

      {/* Spacer, zero on homepage (transparent header sits over hero) */}
      <div
        className={cn(
          'transition-[height] duration-300',
          isHomepage ? 'h-0' : scrolled ? 'h-16' : 'h-24'
        )}
        aria-hidden
      />

      <MobileMenuDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

interface NavItemProps {
  label: string
  href: string
  hasMenu?: boolean
  isActive?: boolean
  className?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function NavItem({
  label,
  href,
  hasMenu,
  isActive,
  className,
  onMouseEnter,
  onMouseLeave,
}: NavItemProps) {
  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Link
        href={href}
        className={cn(
          'text-label uppercase tracking-[0.08em] transition-colors duration-150',
          isActive ? 'text-accent' : 'text-bone hover:text-accent'
        )}
      >
        {label}
      </Link>
      {hasMenu && (
        <span
          className={cn(
            'absolute -bottom-0.5 left-0 h-px bg-accent transition-[width] duration-200',
            isActive ? 'w-full' : 'w-0'
          )}
        />
      )}
    </div>
  )
}

/**
 * Hairline rule tapering into a small gold lozenge, flanking the crest so the
 * medallion reads as a deliberate centrepiece rather than a floating sticker.
 * Desktop only, and it retracts on scroll so the condensed bar stays clean.
 */
function Flourish({ side, hidden }: { side: 'left' | 'right'; hidden: boolean }) {
  const rule = (
    <span
      className={cn(
        'h-px flex-1 bg-gradient-to-r',
        side === 'left' ? 'from-transparent to-accent/45' : 'from-accent/45 to-transparent'
      )}
    />
  )
  const lozenge = <span className="mx-2 h-1 w-1 shrink-0 rotate-45 bg-accent/60" />

  return (
    <span
      aria-hidden
      className={cn(
        'hidden lg:flex items-center overflow-hidden transition-[width,opacity] duration-300',
        hidden ? 'w-0 opacity-0' : 'w-14 opacity-100'
      )}
    >
      {side === 'left' ? (
        <>
          {rule}
          {lozenge}
        </>
      ) : (
        <>
          {lozenge}
          {rule}
        </>
      )}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M1.5 1.5H3.5L5.5 11.5H14.5L16.5 4.5H4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="14.5" r="1" fill="currentColor" />
      <circle cx="13" cy="14.5" r="1" fill="currentColor" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden>
      <path
        d="M0 1H20M0 7H20M0 13H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
