import Link from 'next/link'
import Image from 'next/image'
import Container from './Container'
import { SITE_CONFIG } from '@/lib/config'

const { contact, social, name } = SITE_CONFIG

type FooterLink = { label: string; href: string; external?: boolean }

const linkColumns: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'Number Series', href: '/no-series' },
      { label: 'Signature Scents', href: '/signature' },
      { label: 'Perfume Oils', href: '/oils' },
      { label: 'Home Diffusers', href: '/home' },
      { label: 'Gift Sets', href: '/gifts' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'House Story', href: '/house-story' },
      { label: 'B2B / Bespoke', href: '/b2b' },
      { label: 'Corporate Gifting', href: '/b2b' },
    ],
  },
]

const contactLinks: FooterLink[] = [
  { label: contact.email, href: `mailto:${contact.email}` },
  { label: contact.phoneDisplay, href: `tel:${contact.phone}` },
  { label: contact.address.line1, href: '/house-story' },
  { label: contact.address.line2, href: '/house-story' },
]

const allMobileColumns = [
  ...linkColumns,
  { heading: 'Contact', links: contactLinks },
]

/* Payment method icons as inline SVGs */
function PaymentIcons() {
  return (
    <div className="flex items-center gap-2 mt-4" aria-label="Accepted payment methods">
      {/* Visa */}
      <div className="flex h-6 w-10 items-center justify-center rounded border border-stone/30 bg-stone/10 px-1">
        <svg viewBox="0 0 40 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M15.2 1l-3.4 12H8.4L11.8 1h3.4zm12.2 7.8L29 4.4l1 4.4h-2.6zm3.8 4.2H34L31.4 1H28c-.7 0-1.3.4-1.6 1l-5.6 11h3.9l.8-2.1h4.7l.4 2.1zM21 9c0-3.8-5.3-4-5.3-5.4 0-.5.5-1 1.6-1.1.5 0 2-.1 3.7.6l.7-3.1C20.7.3 19.5 0 18 0c-3.7 0-6.3 2-6.3 4.7 0 2 1.8 3.1 3.2 3.8 1.4.7 1.9 1.1 1.9 1.7 0 .9-1.1 1.3-2.2 1.3-1.8 0-2.9-.5-3.7-.9l-.7 3.2c.9.4 2.4.8 4 .8C18.6 14.6 21 12.7 21 9zM9 1L3.4 13H-.1L-3 4.1c-.2-.7-.4-.9-1-1.2C-4.8 2.4-6.3 2-7.5 1.7l.1-.7h6.3c.8 0 1.5.5 1.7 1.4L2.4 9.8 5.2 1H9z" fill="#1A1F71" transform="translate(6 1) scale(0.7)"/>
        </svg>
      </div>
      {/* Mastercard */}
      <div className="flex h-6 w-10 items-center justify-center rounded border border-stone/30 bg-stone/10 px-1">
        <svg viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <rect x="1" y="1" width="36" height="22" rx="3" fill="none"/>
          <circle cx="14" cy="12" r="7" fill="#EB001B" fillOpacity="0.9"/>
          <circle cx="24" cy="12" r="7" fill="#F79E1B" fillOpacity="0.9"/>
          <path d="M19 7.3A7 7 0 0121.7 12 7 7 0 0119 16.7 7 7 0 0116.3 12 7 7 0 0119 7.3z" fill="#FF5F00"/>
        </svg>
      </div>
      {/* Paystack badge */}
      <div className="flex h-6 items-center justify-center rounded border border-stone/30 bg-stone/10 px-2">
        <span className="text-[9px] font-medium text-stone tracking-wide">PAYSTACK</span>
      </div>
      {/* Bank Transfer */}
      <div className="flex h-6 items-center justify-center rounded border border-stone/30 bg-stone/10 px-2">
        <span className="text-[9px] font-medium text-stone tracking-wide">BANK</span>
      </div>
    </div>
  )
}

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-stone/25 bg-ink mt-auto">
      <Container className="py-16 md:py-20">

        {/* Desktop: single horizontal row */}
        <div className="hidden md:flex md:items-start md:gap-10 lg:gap-14">

          {/* Brand */}
          <div className="w-[200px] shrink-0">
            <Image
              src="/images/logo-wordmark.svg"
              alt="Impact Perfumes"
              width={181}
              height={84}
              unoptimized
              className="h-12 w-auto"
            />
            <p className="mt-4 text-small text-stone leading-relaxed">
              Fragrances, oils &amp; home scents.
              Composed for character.
            </p>

            <PaymentIcons />
          </div>

          {/* Shop · Company, equal flex columns */}
          {linkColumns.map((col) => (
            <div key={col.heading} className="flex-1 min-w-0">
              <p className="text-label uppercase tracking-[0.08em] text-stone mb-5">
                {col.heading}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-small text-bone/70 hover:text-accent transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div className="w-[230px] shrink-0">
            <p className="text-label uppercase tracking-[0.08em] text-stone mb-5">
              Contact
            </p>
            <ul className="space-y-3">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-small text-bone/70 hover:text-accent transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* WhatsApp CTA, outlined button */}
            <Link
              href={social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 border border-stone/30 px-4 text-label uppercase tracking-[0.08em] text-bone/70 hover:border-bone hover:text-bone transition-colors duration-150"
              style={{ height: 36 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </Link>

            {/* Instagram */}
            <Link
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-small text-bone/70 hover:text-accent transition-colors duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
              </svg>
              Instagram
            </Link>
          </div>
        </div>

        {/* Mobile: brand + accordion */}
        <div className="md:hidden">
          <Image
            src="/images/logo-wordmark.svg"
            alt="Impact Perfumes"
            width={181}
            height={84}
            unoptimized
            className="h-11 w-auto"
          />
          <p className="mt-4 text-small text-stone leading-relaxed max-w-[260px]">
            Fragrances, oils &amp; home scents. Composed for character.
          </p>

          {/* WhatsApp CTA mobile */}
          <div className="mt-6 mb-6">
            <Link
              href={social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-stone/30 px-5 text-label uppercase tracking-[0.08em] text-bone/70 hover:border-bone hover:text-bone transition-colors duration-150"
              style={{ height: 40 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </Link>
          </div>

          <div className="divide-y divide-stone/20 border-t border-stone/20">
            {allMobileColumns.map((col) => (
              <details key={col.heading} className="group">
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none select-none text-label uppercase tracking-[0.08em] text-bone">
                  {col.heading}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 transition-transform duration-200 group-open:rotate-180">
                    <path d="M2 5L7 10L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <ul className="pb-5 space-y-4">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        {...('external' in link && link.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className="text-small text-stone hover:text-bone transition-colors duration-150 break-all"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <PaymentIcons />
        </div>
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-stone/20">
        <Container className="h-14 flex items-center justify-between">
          <p className="text-label text-stone">
            © {year} {name}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-label text-stone hover:text-bone transition-colors duration-150">
              Privacy
            </Link>
            <Link href="/terms" className="text-label text-stone hover:text-bone transition-colors duration-150">
              Terms
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  )
}
