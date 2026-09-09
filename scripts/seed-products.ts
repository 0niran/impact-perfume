#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

import fs from 'fs'

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

const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const SANITY_API_TOKEN = process.env.SANITY_API_WRITE_TOKEN || ''

// Medusa v2 stores prices in MAJOR units. ₦50,000 → 50000.
const PLACEHOLDER_PRICE_NGN = 50000


// Utility functions
async function makeRequest(url: string, options: RequestInit = {}) {
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