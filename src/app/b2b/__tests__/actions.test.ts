import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * B2B enquiries used to be written to Sanity and nowhere else — no email, no
 * notification. A high-value corporate lead therefore had a single point of
 * failure, and nobody learned it had arrived unless they opened the CMS.
 *
 * These lock the replacement contract: the enquiry reaches the business inbox,
 * that send is what determines success, and a failure is reported honestly so
 * the customer can reach us another way.
 */
const sendEmail = vi.fn()
vi.mock('@/lib/email', async (orig) => {
  const actual = await orig<typeof import('@/lib/email')>()
  return { ...actual, sendEmail: (...a: unknown[]) => sendEmail(...a) }
})

import { submitInquiry } from '../actions'

const data = {
  type: 'Corporate gifting',
  name: 'Amara Okafor',
  email: 'amara@example.com',
  company: 'Acme Ltd',
  phone: '+234 901 590 0134',
  message: 'We need 200 gift sets for December.',
}

beforeEach(() => vi.clearAllMocks())

describe('submitInquiry', () => {
  it('emails the business inbox', async () => {
    sendEmail.mockResolvedValue(undefined)
    const res = await submitInquiry(data)
    expect(res.ok).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('sets reply-to so a reply reaches the customer, not the no-reply address', async () => {
    sendEmail.mockResolvedValue(undefined)
    await submitInquiry(data)
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ replyTo: 'amara@example.com' })
  })

  it('carries the enquiry details into the email', async () => {
    sendEmail.mockResolvedValue(undefined)
    await submitInquiry(data)
    const { html, subject } = sendEmail.mock.calls[0][0] as { html: string; subject: string }
    expect(subject).toContain('Amara Okafor')
    expect(html).toContain('amara@example.com')
    expect(html).toContain('Acme Ltd')
    expect(html).toContain('200 gift sets')
  })

  it('reports failure when the notification cannot be sent', async () => {
    // The whole point: never tell a customer their enquiry was received when
    // nobody is going to see it.
    sendEmail.mockRejectedValue(new Error('smtp down'))
    const res = await submitInquiry(data)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/email .* directly/i)
  })

  it('escapes customer input rather than trusting it in the HTML', async () => {
    sendEmail.mockResolvedValue(undefined)
    await submitInquiry({ ...data, name: '<script>alert(1)</script>' })
    const { html } = sendEmail.mock.calls[0][0] as { html: string }
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
