import { createClient } from '@sanity/client'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  useCdn: true,
})

export interface ProductReview {
  _id: string
  rating: number
  title: string
  body: string
  customerName: string
  verified: boolean
  submittedAt: string
}

export interface ReviewSummary {
  count: number
  averageRating: number
  reviews: ProductReview[]
}

/**
 * Fetch approved reviews for a product. Matches productSku loosely so the
 * owner can store either the handle (e.g. "no-5") or a specific variant
 * SKU (e.g. "NO-5-100ML") in Sanity and either will surface here.
 */
export async function getProductReviews(productHandle: string): Promise<ReviewSummary> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return { count: 0, averageRating: 0, reviews: [] }
  }
  try {
    // GROQ: match productSku to the handle or any SKU that starts with the
    // uppercase handle (covers Medusa-generated SKUs like NO-5-100ML).
    const query = `*[
      _type == "review"
      && status == "approved"
      && (productSku == $handle || lower(productSku) match $handlePrefix + "*")
    ] | order(submittedAt desc) {
      _id, rating, title, body, customerName, verified, submittedAt
    }`
    const reviews = await sanity.fetch<ProductReview[]>(query, {
      handle: productHandle,
      handlePrefix: productHandle.toLowerCase(),
    })
    const count = reviews.length
    const avg = count > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / count
      : 0
    return {
      count,
      averageRating: Math.round(avg * 10) / 10,
      reviews,
    }
  } catch {
    return { count: 0, averageRating: 0, reviews: [] }
  }
}
