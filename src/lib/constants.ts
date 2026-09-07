// Re-exported so absolute URLs have exactly one definition (lib/config.ts).
// A second copy of the origin is how a domain cutover half-lands.
export { SITE_URL } from '@/lib/config'

export const FALLBACK_COLOR = '#1A1612'
export const FALLBACK_SWATCH_COLOR = '#C9C2B5'

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const

// ISO 3166-1 alpha-2 codes for the worldwide shipping-country selector on the
// CAD / Stripe rail. Display names are derived at render time via
// Intl.DisplayNames, so we don't hand-maintain ~240 localized names. A few
// uninhabited territories are intentionally omitted.
export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GT','GU','GW','GY',
  'HK','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'YE','YT',
  'ZA','ZM','ZW',
] as const

/** Country options ({ code, name }) sorted by localized display name. */
export function countryOptions(locale = 'en'): { code: string; name: string }[] {
  let display: Intl.DisplayNames | null = null
  try {
    display = new Intl.DisplayNames([locale], { type: 'region' })
  } catch {
    display = null
  }
  return COUNTRY_CODES.map((code) => {
    let name = code as string
    try {
      name = display?.of(code) ?? code
    } catch {
      name = code
    }
    return { code, name }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export const SCENT_FAMILIES = [
  'Fruity', 'Woody', 'Vanilla', 'Amber', 'Sweet', 'Citrus',
  'Aromatic', 'Warm Spicy', 'Floral', 'Rose', 'Sweet Oud',
  'Fresh Spicy', 'Oud', 'Leather', 'Coconut', 'Tropical', 'Powdery',
] as const

export type ScentFamily = (typeof SCENT_FAMILIES)[number]
export type NigerianState = (typeof NIGERIAN_STATES)[number]
