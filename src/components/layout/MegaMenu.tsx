import Link from 'next/link'

const MENUS = {
  series: {
    columns: [
      {
        heading: 'Number Series',
        links: [
          { label: 'Shop All', href: '/no-series' },
          { label: 'Fruity', href: '/no-series?family=Fruity' },
          { label: 'Woody', href: '/no-series?family=Woody' },
          { label: 'Amber', href: '/no-series?family=Amber' },
          { label: 'Oud', href: '/no-series?family=Oud' },
          { label: 'Floral', href: '/no-series?family=Floral' },
          { label: 'Citrus', href: '/no-series?family=Citrus' },
        ],
      },
    ],
  },
  homeGifts: {
    columns: [
      {
        heading: 'Home & Car',
        links: [
          { label: 'Shop All', href: '/home' },
          { label: 'Home Diffusers', href: '/home#home-diffusers' },
          { label: 'Scent Candles', href: '/home#scent-candles' },
          { label: 'Scenting Machines', href: '/home#scenting-machines' },
          { label: 'Car Diffusers', href: '/home#car-diffusers' },
        ],
      },
      {
        heading: 'Gift',
        links: [
          { label: 'All Gift Sets', href: '/gifts#gift-sets' },
          { label: 'Bespoke', href: '/bespoke' },
        ],
      },
      {
        heading: 'Discovery Set',
        links: [
          { label: 'Number Series Discovery Set', href: '/gifts#discovery-sets' },
          { label: 'Signature Discovery Set', href: '/gifts#discovery-sets' },
          { label: 'Take the Scent Quiz', href: '/quiz' },
        ],
      },
    ],
  },
  discover: {
    columns: [
      {
        heading: 'The House',
        links: [
          { label: 'House Story', href: '/house-story' },
          { label: 'B2B', href: '/b2b' },
        ],
      },
    ],
  },
} as const

type MenuKey = keyof typeof MENUS

interface MegaMenuProps {
  activeMenu: MenuKey
}

export default function MegaMenu({ activeMenu }: MegaMenuProps) {
  const menu = MENUS[activeMenu]
  const colCount = menu.columns.length

  return (
    <div className="absolute inset-x-0 top-full border-t border-stone/20 bg-ink shadow-[0_12px_40px_rgb(0_0_0/0.6)]">
      <div className="container-px mx-auto max-w-container py-10 pb-12">
        <div
          className="grid gap-12"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {menu.columns.map((col) => (
            <div key={col.heading}>
              <p className="text-label uppercase tracking-[0.08em] text-accent mb-5">
                {col.heading}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-body text-bone hover:text-accent transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
