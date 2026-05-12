/**
 * Static product data for categories not yet in Medusa.
 * When products are added to Medusa, replace these arrays with API calls.
 */

export interface StaticProduct {
  handle: string
  title: string
  descriptor: string
  signatureColor: string
  tagline: string
  badge: string
}

export const OILS: StaticProduct[] = [
  { handle: 'oil-no-5',  title: 'Oil No. 5',  descriptor: 'Sweet Oud',    signatureColor: '#1E64A4', tagline: 'Rich, resinous, intimate.',       badge: '12ml' },
  { handle: 'oil-no-14', title: 'Oil No. 14', descriptor: 'Citrus Burst', signatureColor: '#D4A017', tagline: 'Zesty. Uplifting. Effortless.',    badge: '12ml' },
  { handle: 'oil-no-27', title: 'Oil No. 27', descriptor: 'Fruity Bliss', signatureColor: '#C25719', tagline: 'Playful, warm, unforgettable.',    badge: '12ml' },
  { handle: 'oil-no-33', title: 'Oil No. 33', descriptor: 'Woody Amber',  signatureColor: '#6B4423', tagline: 'Grounded. Sophisticated. Lasting.', badge: '12ml' },
  { handle: 'oil-no-41', title: 'Oil No. 41', descriptor: 'Rose Oud',     signatureColor: '#8B2252', tagline: 'A modern take on a classic pairing.', badge: '12ml' },
  { handle: 'oil-no-48', title: 'Oil No. 48', descriptor: 'Vanilla Noir', signatureColor: '#2C1810', tagline: 'Soft heat. Sweet depth.',           badge: '12ml' },
]

export const CAR_DIFFUSERS: StaticProduct[] = [
  { handle: 'car-diffuser-oud-noir',      title: 'Oud Noir',      descriptor: 'Oud · Leather · Amber',       signatureColor: '#1C1008', tagline: 'Your commute, elevated.',    badge: 'Up to 60 days' },
  { handle: 'car-diffuser-citrus-coast',  title: 'Citrus Coast',  descriptor: 'Citrus · Sea Salt · Vetiver', signatureColor: '#1B5E8C', tagline: 'Fresh air, wherever you go.', badge: 'Up to 60 days' },
  { handle: 'car-diffuser-vanilla-cloud', title: 'Vanilla Cloud', descriptor: 'Vanilla · Sandalwood · Musk', signatureColor: '#C4956A', tagline: 'Warm, welcoming, calm.',       badge: 'Up to 60 days' },
]

export const HOME_DIFFUSERS: StaticProduct[] = [
  { handle: 'home-diffuser-rose-amber',      title: 'Rose Amber',      descriptor: 'Rose · Amber · Patchouli',     signatureColor: '#8B2252', tagline: 'A living room, transformed.',    badge: '100ml · Reed diffuser' },
  { handle: 'home-diffuser-cedar-smoke',     title: 'Cedar & Smoke',   descriptor: 'Cedar · Vetiver · Birch',      signatureColor: '#3D2B1F', tagline: 'The scent of a perfect evening.', badge: '100ml · Reed diffuser' },
  { handle: 'home-diffuser-tropical-breeze', title: 'Tropical Breeze', descriptor: 'Coconut · Mango · Ylang Ylang', signatureColor: '#1A6B45', tagline: 'Bring the outside in.',           badge: '100ml · Reed diffuser' },
]

export interface GiftProduct {
  id: string
  label: string
  title: string
  subtitle: string
  description: string
  signatureColor: string
  cta: { label: string; href: string }
  featured: boolean
}

export const GIFTS: GiftProduct[] = [
  {
    id: 'discovery-set',
    label: 'Most Popular',
    title: 'The Discovery Set',
    subtitle: '5 × 2ml · Find your Number',
    description: 'Five handpicked miniatures from across the Number Series. The perfect starting point, for you or someone you love.',
    signatureColor: '#1A1612',
    cta: { label: 'Shop Discovery Set', href: '/shop' },
    featured: true,
  },
  {
    id: 'duo-gift',
    label: 'Gift Set',
    title: 'The Duo',
    subtitle: '2 × 50ml · Your pick',
    description: 'Choose any two Numbers. We present them together in our signature gift box. Ideal for someone who knows what they want.',
    signatureColor: '#2C4A3E',
    cta: { label: 'Build Your Duo', href: '/shop' },
    featured: false,
  },
  {
    id: 'oil-trio',
    label: 'Gift Set',
    title: 'Oil Trio',
    subtitle: '3 × 12ml · Fragrance oils',
    description: 'Three concentrated fragrance oils in a curated set. Long-lasting, travel-ready, and beautifully presented.',
    signatureColor: '#3D2B1F',
    cta: { label: 'Shop Oil Trio', href: '/oils' },
    featured: false,
  },
  {
    id: 'full-wardrobe',
    label: 'Ultimate Gift',
    title: 'The Wardrobe',
    subtitle: '5 × 50ml · Curated collection',
    description: 'Five Numbers, one house. For the person who deserves the full experience. Our most expansive and most memorable gift.',
    signatureColor: '#1E3A5F',
    cta: { label: 'Enquire', href: '/b2b' },
    featured: false,
  },
]

export interface OccasionLink {
  label: string
  emoji: string
  href: string
}

export const OCCASIONS: OccasionLink[] = [
  { label: 'Birthday',    emoji: '🎂', href: '/gifts' },
  { label: 'Wedding',     emoji: '💍', href: '/gifts' },
  { label: 'Anniversary', emoji: '✨', href: '/gifts' },
  { label: 'Corporate',   emoji: '🏢', href: '/b2b'   },
  { label: 'Graduation',  emoji: '🎓', href: '/gifts' },
  { label: 'Just Because', emoji: '🤍', href: '/gifts' },
]
