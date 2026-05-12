export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://impactperfumes.com'

export const FALLBACK_COLOR = '#1A1612'
export const FALLBACK_SWATCH_COLOR = '#C9C2B5'

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const

export const SCENT_FAMILIES = [
  'Fruity', 'Woody', 'Vanilla', 'Amber', 'Sweet', 'Citrus',
  'Aromatic', 'Warm Spicy', 'Floral', 'Rose', 'Sweet Oud',
  'Fresh Spicy', 'Oud', 'Leather', 'Coconut', 'Tropical', 'Powdery',
] as const

export type ScentFamily = (typeof SCENT_FAMILIES)[number]
export type NigerianState = (typeof NIGERIAN_STATES)[number]
