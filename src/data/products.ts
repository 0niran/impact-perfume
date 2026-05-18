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
  imageUrl: string
  cta: { label: string; href: string }
  featured: boolean
}

export const GIFTS: GiftProduct[] = [
  {
    id: 'discovery-numbers',
    label: 'Discovery Set',
    title: 'Number Series Discovery',
    subtitle: '12 × 5ml',
    description: 'Twelve handpicked 5ml miniatures from across the Number Series. The simplest way to find your Number, or gift the journey.',
    imageUrl: '/images/No Series Discovery Set.jpeg',
    cta: { label: 'Shop the set', href: '/shop' },
    featured: true,
  },
  {
    id: 'discovery-signature',
    label: 'Discovery Set',
    title: 'Signature Discovery',
    subtitle: '5 × 5ml',
    description: 'Five 5ml miniatures from the Signature Collection. Named, not numbered. Bolder compositions.',
    imageUrl: '/images/Signature Discovery Set 2.png',
    cta: { label: 'Shop the set', href: '/signature' },
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
