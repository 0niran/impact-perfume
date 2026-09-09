'use server'

import { getBespokeConfig } from '@/lib/bespokeConfig'
import { computeBespokeEstimate } from '@/lib/bespokePricing'
import {
  buildBespokeCustomerEmail,
  buildBespokeTeamEmail,
  sendEmail,
  type BespokeEmailData,
} from '@/lib/email'
import { SITE_CONFIG } from '@/lib/config'
import { REGIONS, type RegionId } from '@/lib/region'


export interface BespokeFormData {
  inspiration: string
  bottleTypeKey: string
  bottleTypeLabel: string
  color: string
  colorName: string
  /** Volume option key from the config ('50' | '100' | '200'). */
  volumeKey: string
  /** Chosen inscription method key, or null when no inscription was requested. */
  inscriptionKey: string | null
  inscriptionLabel: string | null
  engravingLine1: string
  engravingLine2: string
  quantity: number
  timeline: string
  notes: string
  name: string
  email: string
  phone: string
  city: string
  /** Active market — picks the pricing currency and deposit provider. */
  regionId: RegionId
}

export interface BespokeSubmitResult {
  ok: boolean
  inquiryId?: string
  /** Deposit in MINOR units of `currency` (kobo for NGN, cents for CAD). */
  depositMinor?: number
  /** ISO currency for display and the deposit charge. */
  currency?: 'NGN' | 'CAD'
  error?: string
}

export async function submitBespoke(data: BespokeFormData): Promise<BespokeSubmitResult> {
  if (!data.name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
    return { ok: false, error: 'Name, email, and phone are required.' }
  }

  // Recompute the estimate server-side from the Medusa config, in the region's
  // currency. Never trust a price sent by the client — the deposit is derived
  // from this. Inscription surcharge only applies when text was actually added.
  const region = REGIONS[data.regionId] ?? REGIONS.NG
  const hasInscription = Boolean(data.engravingLine1?.trim() || data.engravingLine2?.trim())
  const config = await getBespokeConfig(region.currencyCode)
  const estimate = config
    ? computeBespokeEstimate(config, {
        volumeKey: data.volumeKey,
        bottleTypeKey: data.bottleTypeKey,
        inscriptionKey: hasInscription ? data.inscriptionKey : null,
        quantity: data.quantity,
      })
    : null

  const estimatePriceMinor = estimate && !estimate.needsQuote ? estimate.totalMinor : 0
  const depositMinor = estimate && !estimate.needsQuote ? estimate.depositMinor : undefined

  try {
    // The reference the customer and the team both quote. It came from the
    // Sanity document id; with Sanity going away it is generated here instead,
    // so the email — which is the record that matters — still carries one.
    const reference = `bespoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`


    // Tell someone. Until now a bespoke request landed in Sanity and nothing
    // else happened, so a customer could design a bottle — and pay a deposit —
    // with the only trace being a Studio document nobody had reason to open.
    const emailData: BespokeEmailData = {
      inquiryId: reference,
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      currency: region.currency,
      quantity: data.quantity,
      volumeLabel: `${data.volumeKey}ml`,
      bottleTypeLabel: data.bottleTypeLabel || data.bottleTypeKey,
      inscriptionLabel: hasInscription
        ? data.inscriptionLabel || data.inscriptionKey || undefined
        : undefined,
      engravingLine1: data.engravingLine1,
      engravingLine2: data.engravingLine2,
      colorName: data.colorName,
      inspiration: data.inspiration,
      timeline: data.timeline,
      city: data.city,
      notes: data.notes,
      totalMinor: estimatePriceMinor,
      depositMinor,
      needsQuote: Boolean(estimate?.needsQuote),
    }

    // The team notification is the one that must land: the inquiry is only
    // actionable if a human learns about it. A failure here is reported, so the
    // customer can retry rather than believe a request was received that nobody
    // will ever see.
    const team = buildBespokeTeamEmail(emailData)
    try {
      await sendEmail({
        to: SITE_CONFIG.contact.email,
        subject: team.subject,
        html: team.html,
      })
    } catch (err) {
      console.error('[bespoke] team notification failed', err)
      return {
        ok: false,
        error:
          'We saved your design but could not alert our team. Please email us so we do not miss it.',
      }
    }

    // The customer acknowledgement is best-effort: the request is already with
    // the team by this point, so a mail failure must not report a failed submit.
    try {
      const ack = buildBespokeCustomerEmail(emailData)
      await sendEmail({ to: data.email, subject: ack.subject, html: ack.html })
    } catch (err) {
      console.error('[bespoke] customer acknowledgement failed', err)
    }

    return { ok: true, inquiryId: reference, depositMinor, currency: region.currency }
  } catch (err) {
    console.error('Bespoke submission failed:', err)
    return { ok: false, error: 'Submission failed. Please try again.' }
  }
}
