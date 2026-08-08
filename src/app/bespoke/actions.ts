'use server'

import { createClient } from '@sanity/client'
import { getBespokeConfig } from '@/lib/bespokeConfig'
import { computeBespokeEstimate } from '@/lib/bespokePricing'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

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
}

export interface BespokeSubmitResult {
  ok: boolean
  inquiryId?: string
  depositKobo?: number
  error?: string
}

export async function submitBespoke(data: BespokeFormData): Promise<BespokeSubmitResult> {
  if (!data.name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
    return { ok: false, error: 'Name, email, and phone are required.' }
  }

  // Recompute the estimate server-side from the Medusa config. Never trust a
  // price sent by the client — the Paystack deposit is derived from this.
  // Inscription surcharge only applies when the customer actually inscribed text.
  const hasInscription = Boolean(data.engravingLine1?.trim() || data.engravingLine2?.trim())
  const config = await getBespokeConfig()
  const estimate = config
    ? computeBespokeEstimate(config, {
        volumeKey: data.volumeKey,
        bottleTypeKey: data.bottleTypeKey,
        inscriptionKey: hasInscription ? data.inscriptionKey : null,
        quantity: data.quantity,
      })
    : null

  const estimatePriceKobo = estimate && !estimate.needsQuote ? estimate.totalMinor : 0
  const depositKobo = estimate && !estimate.needsQuote ? estimate.depositMinor : undefined

  try {
    const doc = await writeClient.create({
      _type: 'inquiry',
      type: 'bespoke',
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.notes,
      submittedAt: new Date().toISOString(),
      status: 'new',
      bespokeConfig: {
        inspiration: data.inspiration,
        bottleType: data.bottleTypeLabel || data.bottleTypeKey,
        color: data.color,
        colorName: data.colorName,
        volume: Number(data.volumeKey) || data.volumeKey,
        inscriptionMethod: hasInscription ? data.inscriptionLabel || data.inscriptionKey : '',
        engravingLine1: data.engravingLine1,
        engravingLine2: data.engravingLine2,
        quantity: data.quantity,
        timeline: data.timeline,
        city: data.city,
        estimatePriceKobo,
      },
    })

    return { ok: true, inquiryId: doc._id, depositKobo }
  } catch (err) {
    console.error('Bespoke submission failed:', err)
    return { ok: false, error: 'Submission failed. Please try again.' }
  }
}
