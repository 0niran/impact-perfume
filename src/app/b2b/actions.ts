'use server'

import { createClient } from '@sanity/client'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

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
  try {
    await writeClient.create({
      _type: 'inquiry',
      type: data.type,
      name: data.name,
      email: data.email,
      company: data.company ?? '',
      phone: data.phone ?? '',
      message: data.message,
      submittedAt: new Date().toISOString(),
      status: 'new',
    })
    return { ok: true }
  } catch (err) {
    console.error('Inquiry submission failed:', err)
    return { ok: false, error: 'Submission failed. Please try again.' }
  }
}
