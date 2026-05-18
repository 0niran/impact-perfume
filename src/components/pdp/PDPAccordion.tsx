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
}

export default function PDPAccordion({ descriptor, tagline }: PDPAccordionProps) {
  return (
    <div className="border-b border-stone/30">
      <AccordionItem title="About this fragrance">
        <p>
          A {descriptor.toLowerCase()} composition from the Impact Number Series.
          {tagline ? ` ${tagline}.` : ''} Each bottle in the series is crafted
          to the same standard. The same heavy-glass flacon, the same black
          cap, a different world inside.
        </p>
      </AccordionItem>

      <AccordionItem title="Shipping & Returns">
        <p>
          Free delivery on orders over ₦50,000. Standard delivery 3–5 business
          days within Lagos; 5–10 days nationwide. Returns accepted within 7 days
          of delivery on unopened, sealed products. Contact us to initiate a return.
        </p>
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
