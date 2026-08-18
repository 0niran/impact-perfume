#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

import fs from 'fs'
import { createClient } from '@sanity/client'

// Types
interface Product {
  number: number
  handle: string
  title: string
  descriptor: string
  scentFamily: string
  signatureColor: string
  signatureColorName: string
  tagline: string
  topNotes: string[]
  heartNotes: string[]
  baseNotes: string[]
  volume: string
  concentration: string
}

interface ProductData {
  brand: {
    name: string
    tagline: string
    ceo: string
  }
  productLines: Array<{
    key: string
    name: string
    description: string
  }>
  scentFamilies: string[]
  products: Product[]
}

// Configuration
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const SANITY_API_TOKEN = process.env.SANITY_API_WRITE_TOKEN || ''

// Medusa v2 stores prices in MAJOR units. ₦50,000 → 50000.
const PLACEHOLDER_PRICE_NGN = 50000

// Initialize Sanity client
const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  token: SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03'
})

// Authenticate with Medusa and return a JWT
async function getMedusaToken(): Promise<string> {
  return adminAuthHeader()
}

let _medusaToken: string | null = null
async function getToken(): Promise<string> {
  return adminAuthHeader()
}

// Utility functions
async function makeRequest(url: string, options: RequestInit = {}) {
  const token = await getToken()
  const response = await fetch(`${MEDUSA_BACKEND_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': adminAuthHeader(),
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`)
  }

  return response.json()
}

async function createFragranceNote(noteName: string): Promise<string> {
  console.log(`Creating fragrance note: ${noteName}`)

  // Check if note already exists
  const existingNotes = await sanityClient.fetch(
    `*[_type == "fragranceNote" && name == $name][0]`,
    { name: noteName }
  )

  if (existingNotes) {
    console.log(`Note "${noteName}" already exists`)
    return existingNotes._id
  }

  // Create new note
  const noteDoc = {
    _type: 'fragranceNote',
    name: noteName,
    family: inferNoteFamily(noteName)
  }

  const result = await sanityClient.create(noteDoc)
  console.log(`Created note: ${noteName} (${result._id})`)
  return result._id
}

function inferNoteFamily(noteName: string): string {
  const name = noteName.toLowerCase()

  if (name.includes('citrus') || name.includes('lemon') || name.includes('orange') ||
      name.includes('bergamot') || name.includes('grapefruit') || name.includes('mandarin') ||
      name.includes('yuzu')) return 'citrus'

  if (name.includes('rose') || name.includes('jasmine') || name.includes('neroli') ||
      name.includes('lily') || name.includes('tuberose') || name.includes('gardenia') ||
      name.includes('orchid') || name.includes('violet') || name.includes('iris') ||
      name.includes('mimosa') || name.includes('carnation')) return 'floral'

  if (name.includes('apple') || name.includes('pear') || name.includes('peach') ||
      name.includes('plum') || name.includes('berry') || name.includes('cherry') ||
      name.includes('pineapple') || name.includes('mango') || name.includes('coconut') ||
      name.includes('passion') || name.includes('cassis')) return 'fruity'

  if (name.includes('wood') || name.includes('cedar') || name.includes('sandalwood') ||
      name.includes('oak') || name.includes('vetiver') || name.includes('patchouli') ||
      name.includes('mahogany') || name.includes('teak') || name.includes('guaiac')) return 'woody'

  if (name.includes('pepper') || name.includes('cinnamon') || name.includes('nutmeg') ||
      name.includes('clove') || name.includes('cardamom') || name.includes('ginger') ||
      name.includes('saffron') || name.includes('cumin') || name.includes('spice')) return 'spicy'

  if (name.includes('vanilla') || name.includes('sugar') || name.includes('honey') ||
      name.includes('praline') || name.includes('tonka') || name.includes('caramel') ||
      name.includes('chocolate') || name.includes('coffee')) return 'sweet'

  if (name.includes('musk') || name.includes('amber') || name.includes('ambergris')) return 'musk'

  if (name.includes('incense') || name.includes('benzoin') || name.includes('labdanum') ||
      name.includes('olibanum') || name.includes('myrrh')) return 'resin'

  if (name.includes('mint') || name.includes('lavender') || name.includes('basil') ||
      name.includes('thyme') || name.includes('rosemary')) return 'aromatic'

  if (name.includes('green') || name.includes('leaf') || name.includes('grass') ||
      name.includes('moss')) return 'green'

  return 'aromatic' // Default fallback
}

async function createMedusaProduct(product: Product): Promise<string> {
  if (await productExistsByHandle(product.handle)) {
    console.log(`${product.title} already exists in Medusa, skipping.`)
    const res = await makeRequest(`/admin/products?handle=${product.handle}&limit=1`)
    return res.products[0].id
  }

  console.log(`Creating Medusa product: ${product.title}`)

  const productData = {
    title: product.title,
    subtitle: product.descriptor,
    handle: product.handle,
    description: `${product.tagline} A ${product.volume} ${product.concentration} from the Impact Number Series.`,
    status: 'published',
    options: [
      {
        title: 'Volume',
        values: [product.volume]
      }
    ],
    variants: [
      {
        title: `${product.title} - ${product.volume}`,
        sku: `${product.handle.toUpperCase()}-${product.volume.replace('ml', 'ML')}`,
        prices: [
          {
            amount: PLACEHOLDER_PRICE_NGN,
            currency_code: 'ngn'
          }
        ],
        options: {
          Volume: product.volume
        }
      }
    ]
  }

  const result = await makeRequest('/admin/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  })

  console.log(`Created product: ${product.title} (${result.product.id})`)
  return result.product.id
}

async function createProductEnrichment(product: Product): Promise<void> {
  console.log(`Creating Sanity enrichment for: ${product.title}`)

  // Get or create fragrance notes
  const allNotes = [...product.topNotes, ...product.heartNotes, ...product.baseNotes]
  const uniqueNotes = [...new Set(allNotes)]

  const notePromises = uniqueNotes.map(note => createFragranceNote(note))
  const noteIds = await Promise.all(notePromises)

  // Create lookup for note IDs
  const noteIdMap: Record<string, string> = {}
  uniqueNotes.forEach((note, index) => {
    noteIdMap[note] = noteIds[index]
  })

  // Create enrichment document
  const enrichmentDoc = {
    _type: 'productEnrichment',
    productHandle: product.handle,
    number: product.number,
    descriptor: product.descriptor,
    scentFamily: product.scentFamily,
    signatureColor: product.signatureColor,
    signatureColorName: product.signatureColorName,
    tagline: product.tagline,
    category: 'number-series',
    volume: product.volume,
    concentration: product.concentration,
    topNotes: product.topNotes.map(note => ({
      _type: 'reference',
      _ref: noteIdMap[note]
    })),
    heartNotes: product.heartNotes.map(note => ({
      _type: 'reference',
      _ref: noteIdMap[note]
    })),
    baseNotes: product.baseNotes.map(note => ({
      _type: 'reference',
      _ref: noteIdMap[note]
    })),
    // Default values for quiz/performance (can be updated later)
    longevity: 4,
    sillage: 4,
    mood: ['Magnetic'],
    occasion: ['Evening']
  }

  const result = await sanityClient.create(enrichmentDoc)
  console.log(`Created enrichment: ${product.title} (${result._id})`)
}

async function productExistsByHandle(handle: string): Promise<boolean> {
  try {
    const res = await makeRequest(`/admin/products?handle=${handle}&limit=1`)
    return res.products && res.products.length > 0
  } catch {
    return false
  }
}

async function createDiscoverySet(): Promise<void> {
  console.log('Creating Discovery Set product...')

  if (await productExistsByHandle('discovery-set')) {
    console.log('Discovery Set already exists, skipping.')
    return
  }

  const discoverySetData = {
    title: 'Discovery Set',
    subtitle: 'Sample the Number Series',
    handle: 'discovery-set',
    description: 'Discover your perfect fragrance with our curated selection of 5ml samples from the Number Series. Each set contains 10 carefully chosen fragrances representing different scent families.',
    status: 'published',
    options: [
      {
        title: 'Type',
        values: ['Discovery Set']
      }
    ],
    variants: [
      {
        title: 'Discovery Set - 10 x 5ml',
        sku: 'DISCOVERY-SET-10X5ML',
        prices: [
          {
            amount: 25000,
            currency_code: 'ngn'
          }
        ],
        options: {
          Type: 'Discovery Set'
        }
      }
    ]
  }

  const result = await makeRequest('/admin/products', {
    method: 'POST',
    body: JSON.stringify(discoverySetData)
  })

  // Create Sanity enrichment for Discovery Set
  const enrichmentDoc = {
    _type: 'productEnrichment',
    productHandle: 'discovery-set',
    descriptor: 'Sample Set',
    scentFamily: 'Mixed',
    signatureColor: '#6B4423',
    signatureColorName: 'Accent',
    tagline: 'Discover your signature scent',
    category: 'discovery-set',
    volume: '10 x 5ml',
    concentration: 'Eau de Parfum',
    longevity: 4,
    sillage: 3,
    mood: ['Joyful', 'Free'],
    occasion: ['Day', 'Travel'],
    story: 'Perfect for the curious nose, our Discovery Set offers a journey through the entire Number Series. Each 5ml vial provides multiple wears, allowing you to experience the full development of each fragrance and find your perfect match.'
  }

  await sanityClient.create(enrichmentDoc)
  console.log(`Created Discovery Set: ${result.product.id}`)
}

async function createProductLineCategories(productLines: Array<{ key: string; name: string; description: string }>): Promise<void> {
  console.log('Creating product line category placeholders...')

  const categoriesToCreate = productLines.filter(line => line.key !== 'number-series')

  for (const line of categoriesToCreate) {
    if (await productExistsByHandle(line.key)) {
      console.log(`${line.name} already exists, skipping.`)
      continue
    }

    console.log(`Creating category: ${line.name}`)

    const categoryData = {
      title: line.name,
      subtitle: 'Coming Soon',
      handle: line.key,
      description: `${line.description} Available soon.`,
      status: 'draft',
      options: [{ title: 'Size', values: ['Standard'] }],
      variants: [
        {
          title: 'Standard',
          sku: `${line.key.toUpperCase()}-PLACEHOLDER`,
          prices: [{ amount: 0, currency_code: 'ngn' }],
          options: { Size: 'Standard' },
        },
      ],
    }

    try {
      const result = await makeRequest('/admin/products', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      })
      console.log(`Created category placeholder: ${line.name} (${result.product.id})`)
    } catch (error) {
      console.error(`Failed to create ${line.name}:`, error)
    }
  }
}

async function main() {
  console.log('🌟 Impact Perfumes Product Seeding Script')
  console.log('==========================================\n')

  // Validate environment variables
  if (!MEDUSA_BACKEND_URL || !SANITY_PROJECT_ID) {
    console.error('❌ Missing required environment variables')
    console.error('Required: NEXT_PUBLIC_MEDUSA_BACKEND_URL, NEXT_PUBLIC_SANITY_PROJECT_ID')
    console.error('Required: MEDUSA_ADMIN_API_KEY, SANITY_API_WRITE_TOKEN')
    process.exit(1)
  }

  try {
    // Load product data
    const dataPath = path.join(process.cwd(), 'data', 'products.seed.json')
    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const productData: ProductData = JSON.parse(rawData)

    console.log(`📦 Loaded ${productData.products.length} products from seed data\n`)

    // 1. Create product line category placeholders
    console.log('1️⃣  Creating product line placeholders...')
    await createProductLineCategories(productData.productLines)
    console.log('✅ Product line placeholders created\n')

    // 2. Create Discovery Set
    console.log('2️⃣  Creating Discovery Set...')
    await createDiscoverySet()
    console.log('✅ Discovery Set created\n')

    // 3. Create all Number Series products
    console.log('3️⃣  Creating Number Series products...')
    for (const product of productData.products) {
      try {
        await createMedusaProduct(product)
        await createProductEnrichment(product)

        // Small delay to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ Failed to create ${product.title}:`, error)
      }
    }
    console.log('✅ All Number Series products created\n')

    console.log('🎉 Product seeding completed successfully!')
    console.log('\nNext steps:')
    console.log('- Check Medusa Admin for your products')
    console.log('- Review Sanity Studio for enrichment data')
    console.log('- Set real prices in Medusa Admin')
    console.log('- Add product images and stories in Sanity')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export default main