interface AccordionItemProps {
  title: string
  children: React.ReactNode
}

function AccordionItem({ title, children }: AccordionItemProps) {
  return (
    <details className="group border-t border-stone/30">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-body font-medium">
        {title}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          <path
            d="M3 6l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="pb-5 text-body text-stone">{children}</div>
    </details>
  )
}

interface PDPAccordionProps {
  descriptor: string
  tagline?: string
  /** Region-aware copy from shippingCopyFor(region). Required so a market
   *  never inherits another market's delivery terms. */
  shippingCopy: string
}

// No default shipping copy on purpose. It used to fall back to the Nigerian
// text (hardcoded ₦200,000), which would silently show naira delivery terms to
// a Canadian shopper if a caller ever forgot the prop. Callers pass
// shippingCopyFor(region) instead, so the copy always matches the market.

export default function PDPAccordion({ descriptor, tagline, shippingCopy }: PDPAccordionProps) {
  return (
    <div className="border-b border-stone/30">
      <AccordionItem title="About this fragrance">
        <p>
          A {descriptor.toLowerCase()} composition from the Number Series.
          {tagline ? ` ${tagline}.` : ''} Each bottle in the series is crafted
          to the same standard. The same heavy-glass flacon, the same black
          cap, a different world inside.
        </p>
      </AccordionItem>

      <AccordionItem title="Shipping & Returns">
        <p>{shippingCopy}</p>
      </AccordionItem>

      <AccordionItem title="B2B & Gifting Enquiries">
        <p>
          Ordering for a hotel, spa, or corporate gift programme? We supply in
          bulk and offer custom packaging.{' '}
          <a href="/b2b" className="link-underline text-accent">
            Submit an enquiry
          </a>{' '}
          and we&apos;ll respond within 24 hours.
        </p>
      </AccordionItem>
    </div>
  )
}
