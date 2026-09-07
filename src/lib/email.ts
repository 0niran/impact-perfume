import { SITE_CONFIG } from '@/lib/config'
import { formatPrice } from '@/lib/format'
import { serverEnv } from '@/lib/env'

/**
 * HTML-escape user-supplied strings before interpolating into the email
 * body. Defence-in-depth — input validation at the API layer already
 * rejects raw HTML, but if a string ever slips through (e.g., the
 * business email shows a customer's submitted name in the inbox preview),
 * escaping here guarantees the email client still treats it as text.
 */
function esc(value: string | undefined | null): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Email templates for transactional messaging. Inline styles only — many
 * clients (Outlook especially) strip <style> blocks and don't support web
 * fonts. We stick to Georgia (universally available) for the brand voice
 * and Arial as a fallback.
 *
 * Palette mirrors the storefront's tailwind tokens:
 *   ink    #0A0A08    bone   #F2E6C8    accent  #E4B250
 *   cream  #F5EFDF    gold   #E8D5A3    stone   #8A7A60
 *   slate  #5C4E38    mist   #1D1B16
 */

const PALETTE = {
  ink: '#0A0A08',
  bone: '#F2E6C8',
  accent: '#E4B250',
  cream: '#F5EFDF',
  gold: '#E8D5A3',
  stone: '#8A7A60',
  slate: '#5C4E38',
  mist: '#1D1B16',
  border: '#E0D4B0',
  outerBg: '#EDE4CB',
} as const

interface OrderItem {
  name: string
  variantLabel?: string
  qty: number
  unitPriceKobo: number
}

interface OrderEmailData {
  reference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: {
    address1: string
    address2?: string
    city: string
    state: string
    country: string
  }
  items: OrderItem[]
  totalKobo: number
  currency?: string
  /** Pre-tax subtotal, MINOR units. When set with taxKobo > 0 the email shows a breakdown. */
  subtotalKobo?: number
  /** Tax added at checkout, MINOR units. */
  taxKobo?: number
  /** Delivery fee, MINOR units. Shown as its own line when > 0. */
  deliveryFeeKobo?: number
  /** 'pickup' shows the store as the collection point instead of a delivery. */
  fulfillmentMethod?: 'pickup' | 'shipping'
  /** Store name when fulfillmentMethod is 'pickup'. */
  pickupLocationName?: string
  /** GIG waybill, when a home-delivery shipment was booked. */
  gigWaybill?: string
  /** Public GIG tracking URL for the waybill. */
  gigTrackingUrl?: string
}

/**
 * Totals block. When tax was added at checkout (taxKobo > 0) it renders
 * Subtotal / Tax / Total; otherwise a single Total row, matching the prior look.
 */
function totalsRows(data: OrderEmailData, currency: string, totalLabel: string): string {
  const hasTax = typeof data.taxKobo === 'number' && data.taxKobo > 0
  const delivery = data.deliveryFeeKobo ?? 0
  const hasDelivery = delivery > 0
  // Product subtotal excludes tax (CA) and delivery. Fall back by subtracting.
  const subtotal = data.subtotalKobo ?? data.totalKobo - (data.taxKobo ?? 0) - delivery
  const taxRow = hasTax
    ? `
      <tr>
        <td style="padding:6px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.slate};">Tax</td>
        <td style="padding:6px 0 0;text-align:right;font-family:Arial,sans-serif;font-size:14px;color:${PALETTE.ink};">${formatPrice(data.taxKobo as number, currency)}</td>
      </tr>`
    : ''
  const deliveryRow = hasDelivery
    ? `
      <tr>
        <td style="padding:6px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.slate};">Delivery</td>
        <td style="padding:6px 0 0;text-align:right;font-family:Arial,sans-serif;font-size:14px;color:${PALETTE.ink};">${formatPrice(delivery, currency)}</td>
      </tr>`
    : ''
  const breakdown =
    hasTax || hasDelivery
      ? `
      <tr>
        <td style="padding:16px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.slate};">Subtotal</td>
        <td style="padding:16px 0 0;text-align:right;font-family:Arial,sans-serif;font-size:14px;color:${PALETTE.ink};">${formatPrice(subtotal, currency)}</td>
      </tr>${taxRow}${deliveryRow}`
      : ''
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;border-top:2px solid ${PALETTE.ink};">
      ${breakdown}
      <tr>
        <td style="padding:18px 0 0;font-family:Arial,sans-serif;font-size:11px;color:${PALETTE.stone};letter-spacing:0.18em;text-transform:uppercase;">
          ${totalLabel}
        </td>
        <td style="padding:18px 0 0;text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${PALETTE.ink};">
          ${formatPrice(data.totalKobo, currency)}
        </td>
      </tr>
    </table>`
}

/** Label + address lines for the delivery/pickup block, shared by both emails. */
function deliveryLabel(data: OrderEmailData): string {
  return data.fulfillmentMethod === 'pickup' ? 'Pick up from' : 'Delivery to'
}
function deliveryLines(data: OrderEmailData): string {
  const a = data.shippingAddress
  const street = `${esc(a.address1)}${a.address2 ? ', ' + esc(a.address2) : ''}`
  if (data.fulfillmentMethod === 'pickup') {
    const store = data.pickupLocationName ? `${esc(data.pickupLocationName)}<br/>` : ''
    return `${esc(data.customerName)}<br/>${store}${street}<br/>${esc(a.city)}, ${esc(a.state)}`
  }
  const tracking = data.gigWaybill
    ? `<br/><br/><span style="color:${PALETTE.slate};">GIG waybill:</span> ${esc(data.gigWaybill)}` +
      (data.gigTrackingUrl
        ? `<br/><a href="${data.gigTrackingUrl}" style="color:${PALETTE.ink};text-decoration:underline;">Track your delivery</a>`
        : '')
    : ''
  return `${esc(data.customerName)}<br/>${street}<br/>${esc(a.city)}, ${esc(a.state)}<br/>${esc(a.country)}${tracking}`
}

/* ----------------------------------------------------------------------------
 * Reusable fragments
 * ------------------------------------------------------------------------- */

function header(): string {
  // Absolute URL is required — most email clients won't resolve relative paths.
  // The image is served from /public, set publicly by Vercel/Next.js.
  const logoSrc = `${SITE_CONFIG.url}/images/Logo.png`
  return `
  <tr>
    <td style="background:${PALETTE.ink};padding:32px 40px 28px;text-align:center;border-bottom:1px solid ${PALETTE.mist};">
      <a href="${SITE_CONFIG.url}" style="text-decoration:none;display:inline-block;">
        <img
          src="${logoSrc}"
          alt="${SITE_CONFIG.name}"
          width="140"
          height="94"
          style="display:block;border:0;outline:none;text-decoration:none;width:140px;height:auto;max-width:140px;margin:0 auto;color:${PALETTE.bone};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;"
        />
      </a>
      <div style="height:1px;background:${PALETTE.accent};width:32px;margin:16px auto 0;line-height:1px;font-size:1px;">&nbsp;</div>
    </td>
  </tr>`
}

function footer(): string {
  return `
  <tr>
    <td style="background:${PALETTE.ink};padding:32px 40px;text-align:center;">
      <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:11px;color:${PALETTE.bone};letter-spacing:0.18em;text-transform:uppercase;">
        ${SITE_CONFIG.name}
      </p>
      <p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:${PALETTE.stone};">
        Composed for character. Worn the world over.
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;line-height:1.7;color:${PALETTE.stone};">
        ${SITE_CONFIG.contact.address.line1}, ${SITE_CONFIG.contact.address.line2}<br/>
        <a href="mailto:${SITE_CONFIG.contact.email}" style="color:${PALETTE.bone};text-decoration:none;">${SITE_CONFIG.contact.email}</a>
        &nbsp;&middot;&nbsp;
        <a href="tel:${SITE_CONFIG.contact.phone}" style="color:${PALETTE.bone};text-decoration:none;">${SITE_CONFIG.contact.phoneDisplay}</a>
      </p>
    </td>
  </tr>`
}

function sectionLabel(label: string): string {
  return `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:10px;color:${PALETTE.stone};letter-spacing:0.18em;text-transform:uppercase;">${label}</p>`
}

function ctaButton(href: string, label: string): string {
  return `
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0;">
    <tr>
      <td style="background:${PALETTE.ink};padding:16px 40px;">
        <a href="${href}" style="font-family:Arial,sans-serif;font-size:11px;color:${PALETTE.bone};text-decoration:none;letter-spacing:0.18em;text-transform:uppercase;display:inline-block;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

function itemRows(items: OrderItem[], currency: string): string {
  return items
    .map(
      (item, i) => `
    <tr>
      <td style="padding:18px 0 ${i === items.length - 1 ? '18px' : '18px'} 0;${i === items.length - 1 ? '' : `border-bottom:1px solid ${PALETTE.border};`}">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${PALETTE.ink};line-height:1.3;">
              ${esc(item.name)}
              ${
                item.variantLabel
                  ? `<div style="margin-top:4px;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};letter-spacing:0.04em;">${esc(item.variantLabel)}${item.qty > 1 ? ` &middot; Qty ${item.qty}` : ''}</div>`
                  : item.qty > 1
                    ? `<div style="margin-top:4px;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};letter-spacing:0.04em;">Qty ${item.qty}</div>`
                    : ''
              }
            </td>
            <td style="text-align:right;font-family:Arial,sans-serif;font-size:15px;color:${PALETTE.ink};white-space:nowrap;padding-left:20px;vertical-align:top;">
              ${formatPrice(item.unitPriceKobo * item.qty, currency)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join('')
}

/* ----------------------------------------------------------------------------
 * Base template
 * ------------------------------------------------------------------------- */

function baseTemplate(title: string, body: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.outerBg};font-family:Arial,sans-serif;">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</div>`
      : ''
  }
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${PALETTE.outerBg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:${PALETTE.cream};max-width:600px;width:100%;border:1px solid ${PALETTE.border};">
        ${header()}
        <tr><td style="padding:44px 40px 40px;">${body}</td></tr>
        ${footer()}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ----------------------------------------------------------------------------
 * Customer order confirmation
 * ------------------------------------------------------------------------- */

export function buildCustomerEmail(data: OrderEmailData): { subject: string; html: string } {
  const firstName = data.customerName?.trim().split(' ')[0] ?? ''
  const currency = data.currency ?? 'NGN'
  const subject = `Order confirmed · ${data.reference}`
  const preheader = `${firstName ? `Thank you, ${firstName}.` : 'Thank you.'} Your order ${data.reference} has been received.`

  const body = `
    ${sectionLabel('Order Confirmed')}
    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:${PALETTE.ink};line-height:1.2;letter-spacing:-0.005em;">
      ${firstName ? `Thank you, ${esc(firstName)}.` : 'Thank you.'}
    </h1>
    <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      Your payment has been received and your order is being prepared.
      We'll be in touch shortly with tracking details.
    </p>

    <div style="height:1px;background:${PALETTE.gold};margin:0 0 28px;line-height:1px;font-size:1px;">&nbsp;</div>

    ${sectionLabel('Your Order')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 0 0;border-top:1px solid ${PALETTE.border};">
      ${itemRows(data.items, currency)}
    </table>

    ${totalsRows(data, currency, 'Total paid')}

    <div style="height:36px;line-height:36px;font-size:1px;">&nbsp;</div>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td width="48%" valign="top">
          ${sectionLabel(deliveryLabel(data))}
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${PALETTE.ink};line-height:1.7;">
            ${deliveryLines(data)}
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          ${sectionLabel('Reference')}
          <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:13px;color:${PALETTE.ink};letter-spacing:0.04em;">
            ${esc(data.reference)}
          </p>
          ${sectionLabel('Contact')}
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:${PALETTE.slate};line-height:1.7;">
            ${esc(data.customerPhone || data.customerEmail)}
          </p>
        </td>
      </tr>
    </table>

    <div style="height:40px;line-height:40px;font-size:1px;">&nbsp;</div>

    ${ctaButton(`${SITE_CONFIG.url}/order-confirmed?ref=${encodeURIComponent(data.reference)}`, 'View order details')}

    <p style="margin:32px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.7;">
      Questions? Reply to this email or reach us at
      <a href="mailto:${SITE_CONFIG.contact.email}" style="color:${PALETTE.slate};">${SITE_CONFIG.contact.email}</a>.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader) }
}

/**
 * Branded confirmation sent to the customer when a refund is issued. The refund
 * itself is issued manually in the Stripe/Paystack dashboard; this fires off the
 * corresponding webhook event so the customer gets a store-branded confirmation
 * rather than only the payment provider's generic notice.
 */
export function buildRefundEmail(data: {
  customerName?: string
  reference: string
  /** Refunded amount in MINOR units (kobo/cents). */
  amountMinor: number
  currency: string
}): { subject: string; html: string } {
  const firstName = data.customerName?.trim().split(' ')[0] ?? ''
  const amount = formatPrice(data.amountMinor, data.currency)
  const subject = `Refund processed · ${data.reference}`
  const preheader = `Your refund of ${amount} has been processed.`

  const body = `
    ${sectionLabel('Refund Processed')}
    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:${PALETTE.ink};line-height:1.2;letter-spacing:-0.005em;">
      ${firstName ? `Your refund is on its way, ${esc(firstName)}.` : 'Your refund is on its way.'}
    </h1>
    <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      We've processed a refund of <strong style="color:${PALETTE.ink};">${amount}</strong> for your order.
      Depending on your bank or card issuer, it can take a few business days to appear on your statement.
    </p>

    <div style="height:1px;background:${PALETTE.gold};margin:0 0 28px;line-height:1px;font-size:1px;">&nbsp;</div>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td width="48%" valign="top">
          ${sectionLabel('Amount Refunded')}
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${PALETTE.ink};line-height:1.6;">
            ${amount}
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          ${sectionLabel('Reference')}
          <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:${PALETTE.ink};letter-spacing:0.04em;">
            ${esc(data.reference)}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:32px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.7;">
      Questions about your refund? Reply to this email or reach us at
      <a href="mailto:${SITE_CONFIG.contact.email}" style="color:${PALETTE.slate};">${SITE_CONFIG.contact.email}</a>.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader) }
}

/**
 * Acknowledgement for a Canadian shipping-quote request.
 *
 * This email carries an unusual burden: the customer has just been through a
 * checkout and NOT been charged. If that is not stated plainly they will either
 * assume the order failed, or wait for a dispatch that is not coming. So it
 * says what we have, what happens next, and that no money has moved.
 */
export function buildShippingQuoteRequestEmail(data: {
  customerName?: string
  deliveryLines: string[]
  itemsTotalMinor: number
  currency: string
}): { subject: string; html: string } {
  const firstName = data.customerName?.trim().split(' ')[0] ?? ''
  const itemsTotal = formatPrice(data.itemsTotalMinor, data.currency)
  const subject = 'We are preparing your shipping quote'
  const preheader = 'We have your order. Your shipping cost follows within one business day.'

  const body = `
    ${sectionLabel('Shipping Quote Requested')}
    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:${PALETTE.ink};line-height:1.2;letter-spacing:-0.005em;">
      ${firstName ? `Thank you, ${esc(firstName)}.` : 'Thank you.'}
    </h1>
    <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      We have your order and where it is going. Canadian delivery is priced per order,
      by weight and destination, so we are working out the best rate for you now.
      <strong style="color:${PALETTE.ink};">No payment has been taken.</strong>
    </p>

    <div style="height:1px;background:${PALETTE.gold};margin:0 0 28px;line-height:1px;font-size:1px;">&nbsp;</div>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td width="48%" valign="top">
          ${sectionLabel('Delivering To')}
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.ink};line-height:1.6;">
            ${data.deliveryLines.map((l) => esc(l)).join('<br />')}
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          ${sectionLabel('Items')}
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${PALETTE.ink};line-height:1.6;">
            ${itemsTotal}
          </p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.6;">
            excluding shipping and tax
          </p>
        </td>
      </tr>
    </table>

    <div style="height:1px;background:${PALETTE.border};margin:28px 0;line-height:1px;font-size:1px;">&nbsp;</div>

    ${sectionLabel('What Happens Next')}
    <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      1. We email you the shipping cost and your full total within one business day.
    </p>
    <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      2. That email includes a secure payment link. Nothing is charged until you use it.
    </p>
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      3. Once paid, we pack, dispatch and send you tracking.
    </p>

    <p style="margin:32px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.7;">
      Need to change the address or add to your order? Just reply to this email, or write to
      <a href="mailto:${SITE_CONFIG.contact.email}" style="color:${PALETTE.slate};">${SITE_CONFIG.contact.email}</a>.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader) }
}

/* ----------------------------------------------------------------------------
 * Bespoke
 * ------------------------------------------------------------------------- */

export interface BespokeEmailData {
  inquiryId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  /** ISO currency of the amounts below (NGN / CAD). */
  currency: string
  quantity: number
  volumeLabel: string
  bottleTypeLabel: string
  inscriptionLabel?: string
  engravingLine1?: string
  engravingLine2?: string
  colorName?: string
  inspiration?: string
  timeline?: string
  city?: string
  notes?: string
  /** Order total in MINOR units. 0 when the order is large enough to need a quote. */
  totalMinor: number
  /** Deposit in MINOR units, when one is due. */
  depositMinor?: number
  /** Large orders are quoted by hand rather than priced live. */
  needsQuote: boolean
}

/** Definition row used by both bespoke emails. Every value is escaped. */
function specRow(label: string, value: string | undefined | null): string {
  if (!value || !String(value).trim()) return ''
  return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${PALETTE.border};font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${PALETTE.stone};white-space:nowrap;vertical-align:top;width:42%;">
        ${esc(label)}
      </td>
      <td style="padding:9px 0;border-bottom:1px solid ${PALETTE.border};font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.ink};vertical-align:top;">
        ${esc(String(value))}
      </td>
    </tr>`
}

function bespokeSpecTable(d: BespokeEmailData): string {
  const engraving = [d.engravingLine1, d.engravingLine2].filter(Boolean).join(' / ')
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 8px;">
      ${specRow('Quantity', String(d.quantity))}
      ${specRow('Volume', d.volumeLabel)}
      ${specRow('Bottle', d.bottleTypeLabel)}
      ${specRow('Inscription', d.inscriptionLabel || 'None')}
      ${specRow('Engraving', engraving)}
      ${specRow('Colour', d.colorName)}
      ${specRow('Inspiration', d.inspiration)}
      ${specRow('Timeline', d.timeline)}
      ${specRow('City', d.city)}
      ${specRow('Notes', d.notes)}
    </table>`
}

/**
 * Confirmation to the customer who submitted a bespoke design.
 *
 * A bespoke request is not an order: nothing has been charged at this point, and
 * a person has to review the design before it can be made. The email has to say
 * both of those plainly, or the customer is left wondering whether they have
 * bought something.
 */
export function buildBespokeCustomerEmail(d: BespokeEmailData): {
  subject: string
  html: string
} {
  const firstName = d.customerName?.trim().split(' ')[0] ?? ''
  const subject = 'We have your bespoke request'
  const preheader = d.needsQuote
    ? 'Our perfumer will come back to you with a tailored quote.'
    : 'Our perfumer is reviewing your design.'

  const money = d.needsQuote
    ? `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
        For an order of this size we price each commission individually, so we will
        send you a tailored quote rather than an automatic estimate.
      </p>`
    : `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="48%" valign="top">
            ${sectionLabel('Estimate')}
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${PALETTE.ink};line-height:1.5;">
              ${formatPrice(d.totalMinor, d.currency)}
            </p>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top">
            ${sectionLabel('Deposit to begin')}
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${PALETTE.ink};line-height:1.5;">
              ${d.depositMinor ? formatPrice(d.depositMinor, d.currency) : '—'}
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.7;">
        An estimate, not a charge. We confirm the final figure with you before anything is taken.
      </p>`

  const body = `
    ${sectionLabel('Bespoke Request Received')}
    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:${PALETTE.ink};line-height:1.2;letter-spacing:-0.005em;">
      ${firstName ? `Thank you, ${esc(firstName)}.` : 'Thank you.'}
    </h1>
    <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      Your design is with our perfumer. Bespoke pieces are composed to order, so a
      person reviews every request before we begin.
      <strong style="color:${PALETTE.ink};">Nothing has been charged.</strong>
    </p>

    <div style="height:1px;background:${PALETTE.gold};margin:0 0 24px;line-height:1px;font-size:1px;">&nbsp;</div>

    ${sectionLabel('Your Design')}
    ${bespokeSpecTable(d)}

    <div style="height:1px;background:${PALETTE.border};margin:24px 0;line-height:1px;font-size:1px;">&nbsp;</div>

    ${money}

    <div style="height:1px;background:${PALETTE.border};margin:24px 0;line-height:1px;font-size:1px;">&nbsp;</div>

    ${sectionLabel('What Happens Next')}
    <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      1. Our perfumer reviews your design and confirms it can be made as specified.
    </p>
    <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      2. We reply with the final figure${d.needsQuote ? '' : ' and a secure link for the deposit'}.
    </p>
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      3. Once confirmed, composition begins and we keep you posted through to delivery.
    </p>

    <p style="margin:32px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.7;">
      Reference <span style="font-family:'Courier New',monospace;color:${PALETTE.slate};">${esc(d.inquiryId)}</span>.
      Reply to this email to change anything, or write to
      <a href="mailto:${SITE_CONFIG.contact.email}" style="color:${PALETTE.slate};">${SITE_CONFIG.contact.email}</a>.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader) }
}

/**
 * The same request, for whoever picks it up.
 *
 * Written to be actioned from the inbox: contact details and the full spec are
 * in the mail, so nobody has to open the Studio to know what was asked for or
 * how to reply.
 */
export function buildBespokeTeamEmail(d: BespokeEmailData): {
  subject: string
  html: string
} {
  const summary = `${d.quantity} x ${d.volumeLabel}`
  const subject =
    `${d.needsQuote ? 'Bespoke QUOTE needed' : 'New bespoke inquiry'} · ${d.customerName} · ${summary}`
      .replace(/[\r\n]/g, '')

  const money = d.needsQuote
    ? `
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.ink};line-height:1.7;">
        Quantity is at or above the quote threshold, so no automatic price was shown
        to the customer. They are expecting a tailored quote.
      </p>`
    : `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="48%" valign="top">
            ${sectionLabel('Estimate shown')}
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${PALETTE.ink};line-height:1.5;">
              ${formatPrice(d.totalMinor, d.currency)}
            </p>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top">
            ${sectionLabel('Deposit due')}
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${PALETTE.ink};line-height:1.5;">
              ${d.depositMinor ? formatPrice(d.depositMinor, d.currency) : '—'}
            </p>
          </td>
        </tr>
      </table>`

  const body = `
    ${sectionLabel(d.needsQuote ? 'Bespoke · Quote Required' : 'Bespoke Inquiry')}
    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:${PALETTE.ink};line-height:1.25;">
      ${esc(d.customerName)} — ${esc(summary)}
    </h1>
    <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      A bespoke design was submitted${d.city ? ` from ${esc(d.city)}` : ''}. No payment has
      been taken yet.
    </p>

    ${sectionLabel('Contact')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">
      ${specRow('Email', d.customerEmail)}
      ${specRow('Phone', d.customerPhone)}
    </table>

    ${sectionLabel('Specification')}
    ${bespokeSpecTable(d)}

    <div style="height:1px;background:${PALETTE.border};margin:24px 0;line-height:1px;font-size:1px;">&nbsp;</div>

    ${money}

    <p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.stone};line-height:1.7;">
      Inquiry <span style="font-family:'Courier New',monospace;color:${PALETTE.slate};">${esc(d.inquiryId)}</span>
      — open it in the Studio at
      <a href="${SITE_CONFIG.url}/studio" style="color:${PALETTE.slate};">${SITE_CONFIG.url}/studio</a>.
      Replying to this email does not reach the customer; write to
      <a href="mailto:${esc(d.customerEmail)}" style="color:${PALETTE.slate};">${esc(d.customerEmail)}</a>.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader(d)) }
}

function preheader(d: BespokeEmailData): string {
  return d.needsQuote
    ? `Quote needed — ${d.quantity} units, ${d.customerName}`
    : `${d.quantity} x ${d.volumeLabel}, deposit ${d.depositMinor ? formatPrice(d.depositMinor, d.currency) : 'n/a'}`
}

/* ----------------------------------------------------------------------------
 * Business / owner notification
 * ------------------------------------------------------------------------- */

export function buildBusinessEmail(data: OrderEmailData): { subject: string; html: string } {
  const currency = data.currency ?? 'NGN'
  const totalDisplay = formatPrice(data.totalKobo, currency)
  // Subject lines aren't HTML-rendered so they don't need escaping, but
  // strip newlines to prevent header-injection style attacks via Resend.
  const safeRef = data.reference.replace(/[\r\n]/g, '')
  const subject = `New order · ${totalDisplay} · ${safeRef}`
  const preheader = `${esc(data.customerName)} · ${data.items.length} item${data.items.length === 1 ? '' : 's'} · ${totalDisplay}`

  const body = `
    ${sectionLabel('New Order')}
    <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:${PALETTE.ink};line-height:1.2;">
      ${totalDisplay}
    </h1>
    <p style="margin:0 0 28px;font-family:'Courier New',monospace;font-size:12px;color:${PALETTE.slate};letter-spacing:0.04em;">
      ${esc(data.reference)}
    </p>

    <div style="height:1px;background:${PALETTE.gold};margin:0 0 24px;line-height:1px;font-size:1px;">&nbsp;</div>

    ${sectionLabel('Customer')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">
      <tr>
        <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${PALETTE.ink};padding-bottom:6px;">
          ${esc(data.customerName)}
        </td>
      </tr>
      <tr>
        <td style="font-family:Arial,sans-serif;font-size:13px;color:${PALETTE.slate};line-height:1.7;">
          <a href="mailto:${encodeURIComponent(data.customerEmail)}" style="color:${PALETTE.slate};text-decoration:none;">${esc(data.customerEmail)}</a><br/>
          <a href="tel:${encodeURIComponent(data.customerPhone)}" style="color:${PALETTE.slate};text-decoration:none;">${esc(data.customerPhone)}</a>
        </td>
      </tr>
    </table>

    ${sectionLabel('Items')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid ${PALETTE.border};">
      ${itemRows(data.items, currency)}
    </table>

    ${totalsRows(data, currency, 'Total paid')}

    <div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>

    ${sectionLabel(deliveryLabel(data))}
    <p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${PALETTE.ink};line-height:1.7;">
      ${deliveryLines(data)}
    </p>

    <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:${PALETTE.stone};line-height:1.7;">
      Manage this order in the Medusa admin. Payment has been verified and captured.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader) }
}

/* ----------------------------------------------------------------------------
 * Owner operational alert (refunds, disputes, reconciliation gaps)
 * ------------------------------------------------------------------------- */

export interface AlertItem {
  title: string
  lines: string[]
}

/**
 * A plain, branded alert to the business inbox for things that need a human:
 * a refund, a dispute, or a captured payment with no Medusa order. Kept generic
 * so one template serves every operational notification.
 */
export function buildOwnerAlertEmail(opts: {
  heading: string
  intro: string
  items: AlertItem[]
  subjectPrefix?: string
}): { subject: string; html: string } {
  const subject = `${opts.subjectPrefix ?? 'Action needed'} · ${opts.heading}`.replace(/[\r\n]/g, '')

  const rows = opts.items
    .map(
      (it) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${PALETTE.border};">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.ink};line-height:1.3;">${esc(it.title)}</div>
          ${it.lines
            .map(
              (l) =>
                `<div style="margin-top:3px;font-family:Arial,sans-serif;font-size:12px;color:${PALETTE.slate};line-height:1.6;">${esc(l)}</div>`
            )
            .join('')}
        </td>
      </tr>`
    )
    .join('')

  const body = `
    ${sectionLabel('Operational Alert')}
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:${PALETTE.ink};line-height:1.2;">
      ${esc(opts.heading)}
    </h1>
    <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${PALETTE.slate};line-height:1.7;">
      ${esc(opts.intro)}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid ${PALETTE.border};">
      ${rows}
    </table>
  `

  return { subject, html: baseTemplate(subject, body) }
}

/* ----------------------------------------------------------------------------
 * Abandoned cart
 * ------------------------------------------------------------------------- */

interface AbandonedCartItem {
  name: string
  variantLabel?: string
  qty: number
  unitPriceMinor: number
}

interface AbandonedCartData {
  customerEmail: string
  currency: string
  totalMinor: number
  items: AbandonedCartItem[]
}

function abandonedItemRows(items: AbandonedCartItem[], currency: string): string {
  // Map to the same shape as the order item rows so the visual treatment matches.
  const mapped: OrderItem[] = items.map((i) => ({
    name: i.name,
    variantLabel: i.variantLabel,
    qty: i.qty,
    unitPriceKobo: i.unitPriceMinor,
  }))
  return itemRows(mapped, currency)
}

export function buildAbandonedCartEmail(data: AbandonedCartData): { subject: string; html: string } {
  const subject = 'Your scent is waiting.'
  const preheader = `Pick up where you left off. ${data.items.length} item${data.items.length === 1 ? '' : 's'} in your cart.`

  const body = `
    ${sectionLabel('Saved for you')}
    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:${PALETTE.ink};line-height:1.2;letter-spacing:-0.005em;">
      Your scent is waiting.
    </h1>
    <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${PALETTE.slate};line-height:1.7;">
      We've kept your selections safe. Return whenever you're ready —
      they'll be here.
    </p>

    <div style="height:1px;background:${PALETTE.gold};margin:0 0 28px;line-height:1px;font-size:1px;">&nbsp;</div>

    ${sectionLabel('In your cart')}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid ${PALETTE.border};">
      ${abandonedItemRows(data.items, data.currency)}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;border-top:2px solid ${PALETTE.ink};">
      <tr>
        <td style="padding:18px 0 0;font-family:Arial,sans-serif;font-size:11px;color:${PALETTE.stone};letter-spacing:0.18em;text-transform:uppercase;">
          Cart total
        </td>
        <td style="padding:18px 0 0;text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${PALETTE.ink};">
          ${formatPrice(data.totalMinor, data.currency)}
        </td>
      </tr>
    </table>

    <div style="height:40px;line-height:40px;font-size:1px;">&nbsp;</div>

    ${ctaButton(`${SITE_CONFIG.url}/checkout`, 'Return to your cart')}

    <p style="margin:32px 0 0;font-family:Arial,sans-serif;font-size:11px;color:${PALETTE.stone};line-height:1.7;">
      Not interested anymore? You can ignore this — we won't send another reminder for this cart.
    </p>
  `

  return { subject, html: baseTemplate(subject, body, preheader) }
}

/* ----------------------------------------------------------------------------
 * Resend transport
 * ------------------------------------------------------------------------- */

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  const apiKey = serverEnv.resendApiKey
  if (!apiKey) return // Silently skip if not configured

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${SITE_CONFIG.name} <orders@impactperfumes.com>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  })
}
