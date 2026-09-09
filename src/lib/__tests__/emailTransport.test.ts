import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * The transport, not the templates.
 *
 * Everything that treats a send as a guarantee — the B2B enquiry, the bespoke
 * team notification — depends on sendEmail throwing when the message does not
 * go out. It previously ignored the response entirely, so a rejection from
 * Resend (unverified sending domain, invalid address, bad key, rate limit)
 * resolved as success and the caller reported the enquiry as received.
 */
let apiKey: string | undefined = 're_test_key'
vi.mock('@/lib/env', () => ({
  serverEnv: {
    get resendApiKey() {
      return apiKey
    },
  },
}))

import { sendEmail } from '../email'

const ok = () => new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 })

beforeEach(() => {
  apiKey = 're_test_key'
  vi.restoreAllMocks()
})
afterEach(() => vi.unstubAllGlobals())

const msg = { to: 'a@example.com', subject: 'Hello', html: '<p>Hi</p>' }

describe('sendEmail', () => {
  it('resolves on a 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()))
    await expect(sendEmail(msg)).resolves.toBeUndefined()
  })

  it('throws when the sending domain is not verified (403)', async () => {
    // The most likely real failure, and the one that used to pass silently.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('domain is not verified', { status: 403 }))
    )
    await expect(sendEmail(msg)).rejects.toThrow(/403/)
  })

  it.each([401, 422, 429, 500])('throws on %i', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status })))
    await expect(sendEmail(msg)).rejects.toThrow(new RegExp(String(status)))
  })

  it('includes the provider’s reason, so a log says why', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('The from address is not verified.', { status: 403 }))
    )
    await expect(sendEmail(msg)).rejects.toThrow(/not verified/)
  })

  it('throws rather than pretending when no API key is configured', async () => {
    apiKey = undefined
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await expect(sendEmail(msg)).rejects.toThrow(/RESEND_API_KEY/)
    expect(f).not.toHaveBeenCalled()
  })

  it('sends to a single address as an array, as the API expects', async () => {
    const f = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', f)
    await sendEmail(msg)
    expect(JSON.parse(f.mock.calls[0][1].body).to).toEqual(['a@example.com'])
  })

  it('passes multiple recipients through', async () => {
    const f = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', f)
    await sendEmail({ ...msg, to: ['a@example.com', 'b@example.com'] })
    expect(JSON.parse(f.mock.calls[0][1].body).to).toHaveLength(2)
  })

  it('sets reply-to when given, and strips newlines from it', async () => {
    const f = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', f)
    await sendEmail({ ...msg, replyTo: 'me@example.com\r\nBcc: evil@example.com' })
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body.reply_to).toBe('me@example.comBcc: evil@example.com')
    expect(body.reply_to).not.toMatch(/[\r\n]/)
  })

  it('omits reply-to when not given', async () => {
    const f = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', f)
    await sendEmail(msg)
    expect(JSON.parse(f.mock.calls[0][1].body)).not.toHaveProperty('reply_to')
  })

  it('sends from the verified sending identity, not the contact address', async () => {
    const f = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', f)
    await sendEmail(msg)
    expect(JSON.parse(f.mock.calls[0][1].body).from).toContain('orders@impactperfumes.com')
  })
})
