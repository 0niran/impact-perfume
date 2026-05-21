#!/usr/bin/env tsx
/**
 * Seeds draft customer reviews into Sanity. All reviews are written with
 * status='pending' so they do NOT appear on the storefront until the owner
 * manually flips 'approved' in Sanity Studio (or via the API).
 *
 * Idempotent: each review's `_id` is derived from a deterministic slug
 * (handle + customerName) so re-running the script updates the same docs
 * rather than creating duplicates.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@sanity/client'
import crypto from 'crypto'

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-10-01',
  useCdn: false,
})

interface SeedReview {
  productSku: string
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  customerName: string
  customerEmail?: string
  verified?: boolean
  submittedAt?: string
}

const REVIEWS: SeedReview[] = [
  // Signature Collection
  {
    productSku: 'enigma',
    rating: 5,
    title: 'Compliments every single time',
    body: "Bought Enigma for my husband and now strangers stop us at events to ask what he's wearing. The opening is sharp with the pepper and bergamot, but it settles into something warm and unforgettable. Lasts the entire evening.",
    customerName: 'Ada Okonkwo',
    customerEmail: 'ada.okonkwo@example.com',
    verified: true,
    submittedAt: '2026-04-18T19:24:00.000Z',
  },
  {
    productSku: 'oud-osmosis-unlimited',
    rating: 5,
    title: 'The real thing',
    body: "I've worn oud fragrances for a decade and most of what I find in stores is either too synthetic or too thin. Oud Osmosis Unlimited is dense, smoky and genuinely beautiful. It's not subtle, but it's not meant to be. Worth every naira.",
    customerName: 'Tunde Adeyemi',
    verified: true,
    submittedAt: '2026-05-02T11:08:00.000Z',
  },
  {
    productSku: 'royale-silver',
    rating: 4,
    title: 'Clean, sharp, office-friendly',
    body: 'Picked this up looking for something I could wear to client meetings without overpowering the room. Royale Silver is exactly that — fresh bergamot up top, iris and cedar in the heart, very polished. Sillage is moderate so you have to spray confidently. Knocking one star because it fades quicker than I expected on my skin.',
    customerName: 'Olufemi Bakare',
    submittedAt: '2026-03-29T08:45:00.000Z',
  },
  {
    productSku: 'solid-oud',
    rating: 5,
    title: 'Ancient, grounding, unforgettable',
    body: "I bought this on a friend's recommendation and was sceptical because pure oud can be intense to the point of being uncomfortable. This one is balanced — smoky and leathery but never harsh. It feels like wearing a memory.",
    customerName: 'Ngozi Ezeh',
    verified: true,
    submittedAt: '2026-04-07T15:32:00.000Z',
  },
  {
    productSku: 'mystikal',
    rating: 5,
    title: 'Worth the price tag',
    body: "Mystikal is a statement scent. I wore it to a wedding and three different people asked me what it was. Deep, complex, mature — this isn't a daytime fragrance, but for evenings it's incomparable.",
    customerName: 'Chinonso Eze',
    verified: true,
    submittedAt: '2026-05-11T20:15:00.000Z',
  },

  // Number Series
  {
    productSku: 'no-1',
    rating: 5,
    title: 'My new everyday',
    body: "No. 1 is the one I reach for most mornings now. Bright opening, a little spicy in the heart, and the dry down is warm without being heavy. Projects well in Lagos heat which is rare.",
    customerName: 'Funke Adebowale',
    customerEmail: 'funke.a@example.com',
    verified: true,
    submittedAt: '2026-04-22T07:51:00.000Z',
  },
  {
    productSku: 'no-5',
    rating: 4,
    title: 'Distinctive without being loud',
    body: "I appreciate that the Number Series doesn't try to be everything to everyone. No. 5 has a clear identity — slightly green, floral middle, woody base. The bottle is also gorgeous. Wish the longevity were a touch stronger but I knew that going in based on the concentration.",
    customerName: 'Sarah Mensah',
    submittedAt: '2026-03-15T13:20:00.000Z',
  },
  {
    productSku: 'no-12',
    rating: 5,
    title: 'A scent I keep getting compliments on',
    body: 'Tried this on a whim from a sample. Within a week I ordered a full bottle. The way it develops on the skin is what sells it — completely different at hour 1 vs hour 6, but every stage feels intentional.',
    customerName: 'Kemi Olatunji',
    verified: true,
    submittedAt: '2026-05-05T16:42:00.000Z',
  },
  {
    productSku: 'no-23',
    rating: 4,
    title: 'Warm and inviting',
    body: "Reminds me of a vanilla-amber I wore in my twenties but more refined. Good cool-weather pick. I'm in Toronto and this carries beautifully on a winter coat.",
    customerName: 'Amara Johnson',
    customerEmail: 'amara.j@example.com',
    submittedAt: '2026-02-28T19:03:00.000Z',
  },
  {
    productSku: 'no-37',
    rating: 5,
    title: 'Smells expensive',
    body: 'I will be honest: I bought No. 37 to test the brand before committing to one of the Signature bottles. It surprised me. The composition feels far above the price. Now I own three from the Number Series.',
    customerName: 'David Onyeka',
    verified: true,
    submittedAt: '2026-04-30T10:17:00.000Z',
  },
]

function deterministicId(productSku: string, customerName: string): string {
  const slug = `${productSku}-${customerName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const hash = crypto.createHash('sha1').update(slug).digest('hex').slice(0, 8)
  return `review-${slug.replace(/^-+|-+$/g, '')}-${hash}`
}

async function seed() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN) {
    console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env.local')
    process.exit(1)
  }

  console.log(`Seeding ${REVIEWS.length} reviews into Sanity (status='pending')…\n`)

  let created = 0
  let updated = 0
  let failed = 0

  for (const r of REVIEWS) {
    const _id = deterministicId(r.productSku, r.customerName)
    const doc = {
      _id,
      _type: 'review',
      productSku: r.productSku,
      rating: r.rating,
      title: r.title,
      body: r.body,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      verified: r.verified ?? false,
      status: 'pending',
      submittedAt: r.submittedAt ?? new Date().toISOString(),
    }
    try {
      const existing = await sanity.fetch(`*[_id == $id][0]{_id}`, { id: _id })
      await sanity.createOrReplace(doc)
      if (existing) {
        updated++
        console.log(`  ↻ ${r.productSku.padEnd(24)} ${r.rating}★ ${r.customerName} (updated)`)
      } else {
        created++
        console.log(`  + ${r.productSku.padEnd(24)} ${r.rating}★ ${r.customerName} (created)`)
      }
    } catch (err) {
      failed++
      console.error(`  ✗ ${r.productSku} ${r.customerName} failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(`  Created:  ${created}`)
  console.log(`  Updated:  ${updated}`)
  console.log(`  Failed:   ${failed}`)
  console.log('────────────────────────────────────────\n')
  console.log('All reviews seeded with status=pending — they are NOT visible on the storefront yet.')
  console.log('Open Sanity Studio → Reviews to approve the ones you want to publish.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
