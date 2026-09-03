export interface MedusaCalculatedPrice {
  calculated_amount: number
  original_amount: number
  currency_code: string
}

export interface MedusaVariant {
  id: string
  calculated_price?: MedusaCalculatedPrice
  /** @deprecated Use calculated_price when region_id is passed */
  prices?: Array<{ amount: number; currency_code: string }>
  /** Inventory fields (requested additively); used to derive availability */
  inventory_quantity?: number
  manage_inventory?: boolean
  allow_backorder?: boolean
}

export interface MedusaProductMetadata {
  number?: string
  descriptor?: string
  scent_family?: string
  signature_color?: string
  signature_color_name?: string
  tagline?: string
  longevity?: string
  sillage?: string
  top_notes?: string
  heart_notes?: string
  base_notes?: string
}

export interface MedusaImage {
  id: string
  url: string
}

export interface MedusaProduct {
  id: string
  handle: string
  title: string
  subtitle?: string
  thumbnail?: string | null
  images?: MedusaImage[]
  metadata?: MedusaProductMetadata | null
  variants?: MedusaVariant[]
}

export interface Enrichment {
  productHandle: string
  number: number
  descriptor: string
  scentFamily?: string
  signatureColor: string
  signatureColorName?: string
  tagline?: string
  longevity?: number
  sillage?: number
  mood?: string[]
  occasion?: string[]
  topNotes?: string[]
  heartNotes?: string[]
  baseNotes?: string[]
}

export interface TileEnrichment {
  productHandle: string
  number: number
  descriptor: string
  scentFamily?: string
  signatureColor: string
  signatureColorName?: string
  tagline?: string
  topNotes?: string[]
  heartNotes?: string[]
  baseNotes?: string[]
  imageUrl?: string
  productId?: string
  variantId?: string
  /** Amount in smallest currency unit (kobo for NGN, cents for CAD) */
  priceMinor?: number
  /** ISO currency code in uppercase, e.g. NGN, CAD */
  currency?: string
  /** Whether the variant can be purchased (in stock / backorder / untracked) */
  inStock?: boolean
}
