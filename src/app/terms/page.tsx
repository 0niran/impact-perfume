import type { Metadata } from 'next'
import Link from 'next/link'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import { SITE_CONFIG, REGION_PRESENCE, CA_PICKUP_LOCATIONS, LEGAL_ENTITIES } from '@/lib/config'
import { REGIONS } from '@/lib/region'
import { formatPrice } from '@/lib/format'
import { LegalPage, Row } from '@/components/legal/LegalPage'

/**
 * Terms & Conditions.
 *
 * Every commercial term stated here matches what the storefront actually does:
 * the free-delivery threshold reads from the same constant the header and the
 * pricing guard use, the Canadian fulfilment description matches
 * Region.deliveryModel, and the returns window matches shippingCopyFor(). If a
 * term changes in the code it must change here too, which is why the numbers
 * are imported rather than typed.
 *
 * Governing law is Nigerian, with an express carve-out preserving mandatory
 * Canadian consumer rights — a single-entity choice of law cannot contract out
 * of Ontario consumer protection, and pretending otherwise would be worse than
 * saying so.
 *
 * Entity names come from LEGAL_ENTITIES in lib/config.
 * NOT LEGAL ADVICE: this is a careful draft, and should be read by a lawyer
 * before launch.
 */

const UPDATED = '2026-09-11'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms on which Impact Perfumes & Oils sells to customers in Nigeria and Canada.',
  alternates: { canonical: '/terms' },
  openGraph: { images: DEFAULT_OG_IMAGES, title: 'Terms & Conditions · Impact Perfumes' },
}

export default function TermsPage() {
  const ngThreshold = formatPrice(
    REGIONS.NG.freeDeliveryThresholdMinor,
    REGIONS.NG.currency
  )
  const brantford = CA_PICKUP_LOCATIONS[0]

  return (
    <LegalPage
      title="Terms &amp; Conditions"
      updated={UPDATED}
      intro={
        <p>
          These terms govern your use of this site and any order you place with us. Please
          read them before buying. Nothing here takes away rights you have under the
          consumer law of the country you live in.
        </p>
      }
      sections={[
        {
          id: 'who-you-buy-from',
          heading: 'Who you are buying from',
          body: (
            <>
              <p>Which company you contract with depends on where your order goes:</p>
              <dl className="mt-2">
                <Row term="Nigeria">
                  <strong className="text-bone">{LEGAL_ENTITIES.NG.name}</strong>,{' '}
                  {REGION_PRESENCE.NG.addressLines.join(', ')}
                </Row>
                <Row term="Canada">
                  <strong className="text-bone">{LEGAL_ENTITIES.CA.name}</strong>,{' '}
                  {REGION_PRESENCE.CA.addressLines.join(', ')}
                </Row>
              </dl>
              <p>
                &ldquo;We&rdquo; and &ldquo;us&rdquo; below mean whichever of those two is
                selling to you.
              </p>
            </>
          ),
        },
        {
          id: 'orders',
          heading: 'Orders',
          body: (
            <>
              <p>
                Placing an order is an offer to buy. A contract forms when we confirm the
                order by email, not when you pay.
              </p>
              <p>
                We may decline an order — if the item is out of stock, if we cannot deliver
                to your address, if the price was listed in error, or if we suspect fraud.
                If we decline after you have paid, we refund you in full.
              </p>
              <p>
                We take reasonable care with prices and descriptions. If an obvious error
                slips through, we are not obliged to sell at the wrong price; we will tell
                you and you can confirm at the right price or cancel for a full refund.
              </p>
            </>
          ),
        },
        {
          id: 'prices-and-payment',
          heading: 'Prices and payment',
          body: (
            <>
              <p>
                Prices show in the currency of the market you are shopping. Nigerian prices
                include VAT at 7.5%. Canadian prices exclude sales tax, which is calculated
                at checkout by province.
              </p>
              <dl className="mt-2">
                <Row term="Nigeria">Card and bank transfer, processed by Paystack.</Row>
                <Row term="Canada">Card, processed by Stripe.</Row>
              </dl>
              <p>
                We never see or store your card details. Payment is taken in full before
                dispatch, except for bespoke commissions, which take a deposit.
              </p>
            </>
          ),
        },
        {
          id: 'delivery',
          heading: 'Delivery and collection',
          body: (
            <>
              <p className="font-medium text-bone">Nigeria</p>
              <p>
                Delivery is {ngThreshold} and over free of charge; below that a fee is
                calculated at checkout from your address. Standard delivery is 3&ndash;5
                business days within the city and 5&ndash;10 days nationwide. You may also
                collect from our Lagos location.
              </p>
              <p className="mt-4 font-medium text-bone">Canada</p>
              <p>
                Collection from {brantford.displayLines.join(', ')} is free. If you would
                rather we shipped, ask for a quote at checkout: we price it by weight and
                destination and email you the cost.{' '}
                <strong className="text-bone">
                  No payment is taken until you have seen and accepted that cost.
                </strong>
              </p>
              <p>
                Delivery times are estimates, not guarantees. Risk in the goods passes to
                you on delivery or collection.
              </p>
            </>
          ),
        },
        {
          id: 'returns',
          heading: 'Returns and refunds',
          body: (
            <>
              <p>
                Fragrance is a hygiene-sensitive product, so returns are limited to items
                that are unopened and still sealed.
              </p>
              <dl className="mt-2">
                <Row term="Window">Within 7 days of delivery or collection.</Row>
                <Row term="Condition">Unopened, sealed, and in original packaging.</Row>
                <Row term="How">
                  Contact us first at{' '}
                  <a
                    href={`mailto:${SITE_CONFIG.contact.email}`}
                    className="text-accent hover:underline"
                  >
                    {SITE_CONFIG.contact.email}
                  </a>{' '}
                  to arrange it. Please do not send anything back unannounced.
                </Row>
                <Row term="Refund">
                  To your original payment method once we have the item back and checked
                  it.
                </Row>
                <Row term="Not returnable">
                  Opened or unsealed fragrance, discovery sets once opened, and bespoke
                  commissions, which are made to your specification.
                </Row>
              </dl>
              <p>
                If an item arrives damaged, faulty or not what you ordered, tell us and we
                will replace or refund it including delivery. That applies whether or not
                the seal is broken, and nothing in this section limits your statutory
                rights.
              </p>
            </>
          ),
        },
        {
          id: 'bespoke',
          heading: 'Bespoke commissions',
          body: (
            <>
              <p>
                A bespoke order is made to your specification, so it works differently from
                a shelf product.
              </p>
              <dl className="mt-2">
                <Row term="Estimate">
                  The figure shown when you submit is an estimate. Nothing is charged at
                  that point.
                </Row>
                <Row term="Deposit">
                  We confirm the final price with you, and take a deposit to begin. The
                  balance is settled before delivery.
                </Row>
                <Row term="Changing your mind">
                  The deposit is refundable within 7 days of payment. After that, work and
                  materials are committed and it is not.
                </Row>
                <Row term="Engraving">
                  Personalised bottles cannot be returned or resold, so please check
                  spelling carefully. We reproduce exactly what you give us.
                </Row>
              </dl>
            </>
          ),
        },
        {
          id: 'using-the-site',
          heading: 'Using this site',
          body: (
            <>
              <p>
                The site, its text, images and the fragrances&apos; names and descriptions
                belong to us. You may browse and share links freely. You may not copy our
                content for commercial use, scrape the site, or try to interfere with how
                it runs.
              </p>
              <p>
                If you post a review, you keep ownership of what you wrote but give us
                permission to display it on the site. We may decline or remove a review
                that is abusive, false, or not about the product.
              </p>
            </>
          ),
        },
        {
          id: 'liability',
          heading: 'Our responsibility to you',
          body: (
            <>
              <p>
                We are responsible for loss you suffer that is a foreseeable result of us
                breaking these terms or failing to use reasonable care. We are not
                responsible for loss that was not foreseeable, or for business losses.
              </p>
              <p>
                We do not exclude our liability for death or personal injury caused by our
                negligence, for fraud, or for anything else the law does not permit us to
                exclude.
              </p>
              <p>
                Fragrance can irritate sensitive skin. Please check the ingredients and
                patch-test if you are prone to reactions. Our products are for external use
                only.
              </p>
            </>
          ),
        },
        {
          id: 'law',
          heading: 'Governing law',
          body: (
            <>
              <p>
                These terms are governed by the laws of the Federal Republic of Nigeria,
                and the courts of Lagos State have jurisdiction over any dispute.
              </p>
              <p>
                <strong className="text-bone">If you are a consumer in Canada</strong>, that
                choice does not remove the protection given to you by the mandatory
                consumer law of your province, and you may bring proceedings in your local
                courts. Where Canadian consumer law gives you a stronger right than these
                terms, that right applies.
              </p>
            </>
          ),
        },
        {
          id: 'general',
          heading: 'General',
          body: (
            <>
              <p>
                If any part of these terms turns out to be unenforceable, the rest still
                applies. If we do not enforce a term straight away, we have not given up
                the right to do so later.
              </p>
              <p>
                We may update these terms. The version that applies to your order is the
                one published when you placed it.
              </p>
              <p>
                How we handle your personal data is set out in our{' '}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          id: 'contact',
          heading: 'Contact',
          body: (
            <dl className="mt-2">
              <Row term="Email">
                <a
                  href={`mailto:${SITE_CONFIG.contact.email}`}
                  className="text-accent hover:underline"
                >
                  {SITE_CONFIG.contact.email}
                </a>
              </Row>
              <Row term="Nigeria">{REGION_PRESENCE.NG.phoneDisplay}</Row>
              <Row term="Canada">{REGION_PRESENCE.CA.phoneDisplay}</Row>
            </dl>
          ),
        },
      ]}
    />
  )
}
