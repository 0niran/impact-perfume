import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 })
  }

  const { email } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ ok: false, message: 'Valid email required.' }, { status: 400 })
  }

  // TODO: integrate with Mailchimp / Klaviyo / Brevo when ready
  // For now, log the signup server-side without exposing PII in client
  // Replace this block with your email platform SDK call:
  //
  // await mailchimp.lists.addListMember(LIST_ID, {
  //   email_address: email,
  //   status: 'subscribed',
  // })

  return NextResponse.json({ ok: true })
}
