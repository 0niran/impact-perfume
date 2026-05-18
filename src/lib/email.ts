import { SITE_CONFIG } from '@/lib/config'
import { formatPrice } from '@/lib/format'

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
}

function itemRows(items: OrderItem[], currency: string): string {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E8E3DC;color:#1A1612;font-size:14px;">
        ${item.name}${item.variantLabel ? ` · ${item.variantLabel}` : ''}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #E8E3DC;text-align:center;color:#6B6459;font-size:14px;">
        ${item.qty}
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #E8E3DC;text-align:right;color:#1A1612;font-size:14px;">
        ${formatPrice(item.unitPriceKobo * item.qty, currency)}
      </td>
    </tr>`
    )
    .join('')
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EB;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FAFAF7;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1A1612;padding:28px 40px;text-align:center;">
            <span style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#F5F1EB;letter-spacing:-0.01em;">
              ${SITE_CONFIG.shortName}
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#1A1612;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#9B9289;letter-spacing:0.08em;text-transform:uppercase;">
              ${SITE_CONFIG.name}
            </p>
            <p style="margin:0;font-size:11px;color:#6B6459;">
              ${SITE_CONFIG.contact.address.line1}, ${SITE_CONFIG.contact.address.line2}<br/>
              <a href="mailto:${SITE_CONFIG.contact.email}" style="color:#6B6459;">${SITE_CONFIG.contact.email}</a>
              &nbsp;·&nbsp;
              <a href="tel:${SITE_CONFIG.contact.phone}" style="color:#6B6459;">${SITE_CONFIG.contact.phoneDisplay}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildCustomerEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `Order Confirmed. Ref: ${data.reference}`
  const html = baseTemplate(
    subject,
    `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:28px;font-weight:400;color:#1A1612;">
      Order Confirmed.
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6B6459;line-height:1.6;">
      Thank you${data.customerName ? `, ${data.customerName.split(' ')[0]}` : ''}. Your payment was received and your order is being prepared.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E3DC;margin-bottom:24px;">
      <tr style="background:#F5F1EB;">
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;font-weight:normal;">Item</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;font-weight:normal;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;font-weight:normal;">Total</th>
      </tr>
      ${itemRows(data.items, data.currency ?? 'NGN')}
      <tr>
        <td colspan="2" style="padding:14px 0;text-align:right;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;padding-right:12px;">Total Paid</td>
        <td style="padding:14px 0 14px 12px;text-align:right;font-size:16px;font-weight:700;color:#1A1612;">${formatPrice(data.totalKobo, data.currency ?? 'NGN')}</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="48%" style="vertical-align:top;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;">Delivery to</p>
          <p style="margin:0;font-size:13px;color:#1A1612;line-height:1.6;">
            ${data.customerName}<br/>
            ${data.shippingAddress.address1}${data.shippingAddress.address2 ? ', ' + data.shippingAddress.address2 : ''}<br/>
            ${data.shippingAddress.city}, ${data.shippingAddress.state}<br/>
            ${data.shippingAddress.country}
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="vertical-align:top;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;">Reference</p>
          <p style="margin:0;font-size:13px;font-family:monospace;color:#1A1612;">${data.reference}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6B6459;">We'll contact you on<br/>${data.customerPhone} with tracking info.</p>
        </td>
      </tr>
    </table>

    <a href="${SITE_CONFIG.url}/shop" style="display:inline-block;background:#1A1612;color:#F5F1EB;padding:14px 32px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;">
      Continue Shopping
    </a>
    `
  )
  return { subject, html }
}

export function buildBusinessEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `New Order · ${data.reference} · ${formatPrice(data.totalKobo, data.currency ?? 'NGN')}`
  const html = baseTemplate(
    subject,
    `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1A1612;">
      New Order Received
    </h1>
    <p style="margin:0 0 24px;font-size:13px;color:#6B6459;">
      Reference: <strong style="font-family:monospace;">${data.reference}</strong>
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E3DC;margin-bottom:24px;">
      <tr style="background:#F5F1EB;">
        <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;font-weight:normal;">Item</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;font-weight:normal;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;font-weight:normal;">Total</th>
      </tr>
      ${itemRows(data.items, data.currency ?? 'NGN')}
      <tr>
        <td colspan="2" style="padding:14px 0;text-align:right;font-size:13px;font-weight:700;color:#1A1612;padding-right:12px;">TOTAL</td>
        <td style="padding:14px 0 14px 12px;text-align:right;font-size:16px;font-weight:700;color:#1A1612;">${formatPrice(data.totalKobo, data.currency ?? 'NGN')}</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E3DC;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;">Customer</p>
          <p style="margin:0;font-size:14px;color:#1A1612;font-weight:600;">${data.customerName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6B6459;">${data.customerEmail} · ${data.customerPhone}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;border-top:1px solid #E8E3DC;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6B6459;">Delivery Address</p>
          <p style="margin:0;font-size:13px;color:#1A1612;line-height:1.6;">
            ${data.shippingAddress.address1}${data.shippingAddress.address2 ? ', ' + data.shippingAddress.address2 : ''}<br/>
            ${data.shippingAddress.city}, ${data.shippingAddress.state}, ${data.shippingAddress.country}
          </p>
        </td>
      </tr>
    </table>
    `
  )
  return { subject, html }
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
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
