'use server'

import { SITE_CONFIG } from '@/lib/config'
import { buildOwnerAlertEmail, sendEmail } from '@/lib/email'

/**
 * B2B and corporate-gifting enquiries.
 *
 * These used to be written to a Sanity document and nowhere else — no email,
 * no notification. Two consequences: nobody learned an enquiry had arrived
 * unless they went looking in the CMS, and if Sanity was unreachable the
 * submission simply failed and a high-value lead was lost.
 *
 * The enquiry now goes to the business inbox, and that send is the thing that
 * must succeed. If it fails we say so, so the customer can reach us another
 * way rather than believing a request was received that nobody will ever see.
 * This mirrors how bespoke submissions already work.
 */

export interface InquiryFormData {
  type: string
  name: string
  email: string
  company?: string
  phone?: string
  message: string
}

export interface SubmitResult {
  ok: boolean
  error?: string
}

export async function submitInquiry(data: InquiryFormData): Promise<SubmitResult> {
  // All values are escaped by the email builder before they reach the HTML.
  const team = buildOwnerAlertEmail({
    subjectPrefix: 'New enquiry',
    heading: `${data.type} enquiry from ${data.name}`,
    intro: 'Submitted through the B2B form on the storefront. Reply directly to the customer.',
    items: [
      {
        title: data.name,
        lines: [
          data.email,
          data.phone ? `Phone: ${data.phone}` : '',
          data.company ? `Company: ${data.company}` : '',
          `Type: ${data.type}`,
        ].filter(Boolean),
      },
      { title: 'Message', lines: data.message.split('\n').filter(Boolean) },
    ],
  })

  try {
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: team.subject,
      html: team.html,
      // So a reply from the inbox goes straight back to the customer.
      replyTo: data.email,
    })
  } catch (err) {
    console.error('[b2b] enquiry notification failed', err)
    return {
      ok: false,
      error: `We could not send your enquiry. Please email ${SITE_CONFIG.contact.email} directly so we do not miss it.`,
    }
  }

  return { ok: true }
}
