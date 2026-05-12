import Link from 'next/link'

const MENUS = {
  series: {
    columns: [
      {
        heading: 'Number Collection',
        links: [
          { label: 'Shop All', href: '/shop' },
          { label: 'Fruity', href: '/shop?family=Fruity' },
          { label: 'Woody', href: '/shop?family=Woody' },
          { label: 'Amber', href: '/shop?family=Amber' },
          { label: 'Oud', href: '/shop?family=Oud' },
          { label: 'Floral', href: '/shop?family=Floral' },
          { label: 'Citrus', href: '/shop?family=Citrus' },
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
          { label: 'B2B / Bespoke', href: '/b2b' },
          { label: 'Journal', href: '/journal' },
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
