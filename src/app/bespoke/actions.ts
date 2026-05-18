'use server'

import { createClient } from '@sanity/client'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

export interface BespokeFormData {
  inspiration: string
  shape: string
  color: string
  colorName: string
  volume: number
  engravingLine1: string
  engravingLine2: string
  quantity: number
  timeline: string
  notes: string
  name: string
  email: string
  phone: string
  city: string
  estimatePriceKobo: number
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
        shape: data.shape,
        color: data.color,
        colorName: data.colorName,
        volume: data.volume,
        engravingLine1: data.engravingLine1,
        engravingLine2: data.engravingLine2,
        quantity: data.quantity,
        timeline: data.timeline,
        city: data.city,
        estimatePriceKobo: data.estimatePriceKobo,
      },
    })

    return {
      ok: true,
      inquiryId: doc._id,
      depositKobo: Math.round(data.estimatePriceKobo * 0.5),
    }
  } catch (err) {
    console.error('Bespoke submission failed:', err)
    return { ok: false, error: 'Submission failed. Please try again.' }
  }
}
