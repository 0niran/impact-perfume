import type { Metadata } from 'next'
import Link from 'next/link'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import { SITE_CONFIG, REGION_PRESENCE } from '@/lib/config'
import { LegalPage, Row } from '@/components/legal/LegalPage'

/**
 * Privacy notice.
 *
 * Written against what the storefront actually does rather than a template:
 * every recipient named below appears in the codebase, and every cookie listed
 * is one the site sets. Two things that would normally bloat a notice are
 * absent because the site genuinely does not do them — there is no analytics,
 * advertising or tracking of any kind, and no third-party cookie.
 *
 * Jurisdictions: the Nigeria Data Protection Act 2023 (which replaced the NDPR
 * 2019) for Nigerian customers, and PIPEDA for Canadian ones.
 *
 * PLACEHOLDERS: the two registered entity names and numbers are marked
 * [NG ENTITY] / [CA ENTITY] pending the details.
 */

const UPDATED = '2026-09-08'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Impact Perfumes & Oils collects, uses and protects your personal data, in Nigeria and Canada.',
  alternates: { canonical: '/privacy' },
  openGraph: { images: DEFAULT_OG_IMAGES, title: 'Privacy Policy · Impact Perfumes' },
}

const PRIVACY_EMAIL = 'privacy@impactperfumes.com'

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          This notice explains what personal data we collect when you shop with us, why we
          collect it, who we share it with, and the rights you have over it. We have tried
          to write it plainly. If anything here is unclear, write to{' '}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-accent hover:underline">
            {PRIVACY_EMAIL}
          </a>{' '}
          and we will explain it.
        </p>
      }
      sections={[
        {
          id: 'who-we-are',
          heading: 'Who we are',
          body: (
            <>
              <p>
                Impact Perfumes &amp; Oils is a fragrance house selling in Nigeria and
                Canada. Which company you are contracting with, and which is responsible
                for your data, depends on where your order is delivered:
              </p>
              <dl className="mt-2">
                <Row term="Nigeria">
                  <strong className="text-bone">[NG ENTITY]</strong> (RC [NUMBER]),{' '}
                  {REGION_PRESENCE.NG.addressLines.join(', ')}
                </Row>
                <Row term="Canada">
                  <strong className="text-bone">[CA ENTITY]</strong> ([NUMBER]),{' '}
                  {REGION_PRESENCE.CA.addressLines.join(', ')}
                </Row>
              </dl>
              <p>
                For Nigerian customers this notice is given under the Nigeria Data
                Protection Act 2023. For Canadian customers it is given under PIPEDA.
                Where the two differ, we apply whichever gives you the stronger
                protection.
              </p>
            </>
          ),
        },
        {
          id: 'what-we-collect',
          heading: 'What we collect',
          body: (
            <>
              <p>Only what an order actually needs, and only when you give it to us.</p>
              <dl className="mt-2">
                <Row term="Ordering">
                  Your name, email address, phone number, and the delivery or collection
                  address for the order.
                </Row>
                <Row term="Payment">
                  We never see or store your card details. Payment is handled entirely by
                  Paystack (Nigeria) or Stripe (Canada); we receive only a reference and
                  whether the payment succeeded.
                </Row>
                <Row term="Enquiries">
                  If you contact us through the B2B or bespoke forms: your name, email,
                  phone, company where given, and what you wrote.
                </Row>
                <Row term="Saved carts">
                  If you enter your email at checkout but do not finish, we keep the cart
                  and that email so we can remind you — but only if you ticked the box
                  agreeing to it. That consent is recorded with a timestamp.
                </Row>
                <Row term="Technical">
                  Your IP address, briefly, to rate-limit our forms against abuse. Your
                  approximate country, from your network, so we show you the right market
                  and currency.
                </Row>
              </dl>
              <p>
                We do not collect date of birth, gender, or any special category of data,
                and we do not buy personal data from anyone.
              </p>
            </>
          ),
        },
        {
          id: 'why',
          heading: 'Why we use it, and our lawful basis',
          body: (
            <>
              <dl className="mt-2">
                <Row term="To fulfil your order">
                  Taking payment, arranging delivery or collection, sending confirmations
                  and delivery updates. Basis: performance of our contract with you.
                </Row>
                <Row term="To answer you">
                  Responding to enquiries, quotes and bespoke requests. Basis: your
                  request, and our legitimate interest in running the business.
                </Row>
                <Row term="Reminder emails">
                  Reminding you about a cart you left. Basis: your consent, which you gave
                  at checkout and can withdraw at any time.
                </Row>
                <Row term="Keeping the site working">
                  Rate-limiting, fraud prevention, and showing the correct market. Basis:
                  our legitimate interest in a secure, functioning shop.
                </Row>
                <Row term="Records">
                  Keeping order and tax records. Basis: our legal obligations.
                </Row>
              </dl>
              <p>
                We do not use your data for automated decision-making or profiling, and we
                do not sell it. Ever, to anyone.
              </p>
            </>
          ),
        },
        {
          id: 'who-we-share-with',
          heading: 'Who we share it with',
          body: (
            <>
              <p>
                Only the services that make an order work. Each one gets the minimum it
                needs, and none of them may use your data for their own purposes.
              </p>
              <dl className="mt-2">
                <Row term="Paystack">Payment processing for Nigerian orders.</Row>
                <Row term="Stripe">Payment processing for Canadian orders.</Row>
                <Row term="GIG Logistics">
                  Name, address and phone, for Nigerian home delivery.
                </Row>
                <Row term="Resend">Sending order confirmations and other email.</Row>
                <Row term="Google Maps Platform">
                  Address text as you type it, to verify and autocomplete it.
                </Row>
                <Row term="Vercel, Railway, Upstash">
                  Hosting, the order system, and the saved-cart and rate-limit store.
                </Row>
              </dl>
              <p>
                We will also disclose data where the law requires it. If the business is
                ever sold, order records may transfer with it, and we will tell you first.
              </p>
            </>
          ),
        },
        {
          id: 'cookies',
          heading: 'Cookies',
          body: (
            <>
              <p>
                We use six cookies. All of them are functional: they make the shop work.
                We run <strong className="text-bone">no analytics, no advertising and no
                tracking cookies</strong>, and no third party sets a cookie through our
                site. That is why you are not asked to accept anything.
              </p>
              <dl className="mt-2">
                <Row term="impact_region">Which market you are shopping, so prices show in the right currency.</Row>
                <Row term="impact_region_manual">Records that you chose your market yourself, so we stop correcting it.</Row>
                <Row term="impact_geo">The market your network suggests, so we can offer to switch you.</Row>
                <Row term="impact_region_suggest_dismissed">That you dismissed that offer, so we stop asking.</Row>
                <Row term="impact_perfumes">Your cart, so it survives a refresh.</Row>
                <Row term="impact_quote_email">Your email on the Canadian quote confirmation, so we can show it back to you.</Row>
              </dl>
              <p>
                You can clear these in your browser at any time. The shop will still work;
                it will just forget your market and your cart.
              </p>
            </>
          ),
        },
        {
          id: 'how-long',
          heading: 'How long we keep it',
          body: (
            <>
              <dl className="mt-2">
                <Row term="Orders">
                  For as long as tax and accounting law requires us to keep the record.
                </Row>
                <Row term="Enquiries and quotes">
                  Up to two years after we last spoke, so we have context if you come
                  back.
                </Row>
                <Row term="Saved carts">
                  Deleted once the reminder has been sent or the cart is completed.
                </Row>
                <Row term="Newsletter">Until you unsubscribe.</Row>
                <Row term="IP addresses">
                  Minutes. They exist only to count requests against a rate limit.
                </Row>
              </dl>
            </>
          ),
        },
        {
          id: 'your-rights',
          heading: 'Your rights',
          body: (
            <>
              <p>You can ask us to:</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>tell you what data we hold about you, and give you a copy</li>
                <li>correct anything that is wrong</li>
                <li>delete your data, where we are not required to keep it</li>
                <li>stop using it for a particular purpose, or restrict how we use it</li>
                <li>send your data to another provider</li>
                <li>withdraw consent you have given, at any time</li>
              </ul>
              <p>
                Write to{' '}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="text-accent hover:underline">
                  {PRIVACY_EMAIL}
                </a>
                . We will respond within 30 days and will not charge you.
              </p>
              <p>
                If you are unhappy with how we have handled it, Nigerian customers may
                complain to the Nigeria Data Protection Commission, and Canadian customers
                to the Office of the Privacy Commissioner of Canada.
              </p>
            </>
          ),
        },
        {
          id: 'transfers',
          heading: 'Where your data goes',
          body: (
            <p>
              We sell in Nigeria and Canada, and the services listed above operate
              internationally, so your data may be processed outside the country you live
              in. Where that happens we rely on the provider&apos;s contractual data
              protection commitments, and we choose providers that offer them.
            </p>
          ),
        },
        {
          id: 'security',
          heading: 'How we protect it',
          body: (
            <>
              <p>
                The site is served entirely over HTTPS. Card details never touch our
                systems. Access to order data is restricted to the people who need it, and
                our forms are rate-limited against abuse.
              </p>
              <p>
                No system is perfect. If a breach ever affects your data, we will tell you
                and the relevant regulator as the law requires.
              </p>
            </>
          ),
        },
        {
          id: 'children',
          heading: 'Children',
          body: (
            <p>
              Our shop is not intended for children, and we do not knowingly collect data
              from anyone under 18. If you believe a child has given us data, write to us
              and we will delete it.
            </p>
          ),
        },
        {
          id: 'changes',
          heading: 'Changes to this notice',
          body: (
            <p>
              If we change how we use your data we will update this page and the date at
              the top. Where a change is significant, we will tell you directly rather than
              relying on you to notice.
            </p>
          ),
        },
        {
          id: 'contact',
          heading: 'Contact',
          body: (
            <>
              <dl className="mt-2">
                <Row term="Privacy questions">
                  <a href={`mailto:${PRIVACY_EMAIL}`} className="text-accent hover:underline">
                    {PRIVACY_EMAIL}
                  </a>
                </Row>
                <Row term="Anything else">
                  <a
                    href={`mailto:${SITE_CONFIG.contact.email}`}
                    className="text-accent hover:underline"
                  >
                    {SITE_CONFIG.contact.email}
                  </a>
                </Row>
              </dl>
              <p>
                See also our{' '}
                <Link href="/terms" className="text-accent hover:underline">
                  Terms &amp; Conditions
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
