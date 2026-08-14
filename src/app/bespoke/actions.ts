'use server'

import { createClient } from '@sanity/client'
import { getBespokeConfig } from '@/lib/bespokeConfig'
import { computeBespokeEstimate } from '@/lib/bespokePricing'
import { REGIONS, type RegionId } from '@/lib/region'

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
        // Sanity field name kept for Studio compatibility; holds MINOR units of
        // `currency` (kobo for NGN, cents for CAD). `currency` disambiguates so
        // the perfumer can tell CA$67 from ₦67.
        estimatePriceKobo: estimatePriceMinor,
        currency: region.currency,
      },
    })

    return { ok: true, inquiryId: doc._id, depositMinor, currency: region.currency }
  } catch (err) {
    console.error('Bespoke submission failed:', err)
    return { ok: false, error: 'Submission failed. Please try again.' }
  }
}
