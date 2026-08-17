import { z } from 'zod'

/**
 * Server-side input validation for checkout and PII-collecting endpoints.
 *
 * Defence-in-depth — the storefront form does its own client-side checks
 * but those can be bypassed by anyone POSTing directly. Every route that
 * accepts customer data should run input through these schemas before
 * doing anything else.
 *
 * Rules of thumb:
 *   - Reject ASCII control chars (\x00-\x1F, \x7F) — they're never legitimate
 *     in a customer name or address.
 *   - Reject HTML tag-shaped substrings (basic XSS prophylactic; the email
 *     renderer ALSO escapes, this is belt-and-braces).
 *   - Bound lengths so malicious payloads can't bloat downstream storage
 *     (Sanity docs, Medusa metadata, Stripe metadata which has hard 500-char
 *     limits per value).
 *   - Allow Unicode letters / diacritics — Nigerian and Canadian names use
 *     them routinely.
 */

const CONTROL_CHARS = /[\x00-\x1F\x7F]/
const HTML_TAG = /<[a-zA-Z!/][^>]*>/

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .max(max, `Must be ${max} characters or fewer`)
    .refine((s) => !CONTROL_CHARS.test(s), 'Invalid characters')
    .refine((s) => !HTML_TAG.test(s), 'HTML is not allowed')

const optionalSafeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .refine((s) => !CONTROL_CHARS.test(s), 'Invalid characters')
    .refine((s) => !HTML_TAG.test(s), 'HTML is not allowed')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(254, 'Email is too long')

// Permissive phone: digits, spaces, +, -, parentheses. Range 5-30 covers
// short national numbers up to formatted internationals.
export const phoneSchema = z
  .string()
  .trim()
  .min(5, 'Phone number is too short')
  .max(30, 'Phone number is too long')
  .regex(/^[\d\s+\-()]+$/, 'Invalid phone number')

export const customerNameSchema = safeText(200)

export const cartLineInputSchema = z.object({
  // Medusa ids are like 'variant_01KR…' — alphanumeric + underscore.
  variantId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid variant id'),
  productId: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-zA-Z0-9_-]*$/, 'Invalid product id')
    .optional(),
  name: safeText(200),
  variantLabel: optionalSafeText(120).optional(),
  qty: z.number().int('Quantity must be a whole number').min(1).max(99),
  unitPriceKobo: z
    .number()
    .int()
    .min(0)
    .max(100_000_000, 'Price out of range'),
  currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
})

export type CartLineInput = z.infer<typeof cartLineInputSchema>

// --- Region-specific shipping ---

export const ngShippingAddressSchema = z.object({
  address1: safeText(200),
  address2: optionalSafeText(200).optional(),
  city: safeText(100),
  state: safeText(100),
  postalCode: optionalSafeText(20).optional(),
  country: z.literal('Nigeria'),
})

// International shipping address for the CAD / Stripe rail. Every visitor
// outside Nigeria checks out here, so the country is selectable and the postal
// code is validated generically — formats vary too much worldwide to pin to a
// single regex.
export const intlShippingAddressSchema = z.object({
  address1: safeText(200),
  address2: optionalSafeText(200).optional(),
  city: safeText(100),
  // State / province / region — free text (varies by country).
  state: safeText(100),
  postalCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Postal / ZIP code is required')
    .max(12, 'Postal / ZIP code is too long')
    .regex(/^[A-Z0-9][A-Z0-9 -]*$/, 'Invalid postal / ZIP code'),
  country: safeText(100),
  // ISO 3166-1 alpha-2, used for tax calculation and the Medusa country_code.
  // Optional for backwards compatibility with in-flight clients.
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Invalid country code')
    .optional(),
})

// --- Endpoint payloads ---

export const verifyPaymentBodySchema = z.object({
  reference: z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid reference'),
  amountKobo: z.number().int().min(1).max(10_000_000_000),
  customerName: customerNameSchema,
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  shippingAddress: ngShippingAddressSchema,
  // How the order is fulfilled. Defaults to shipping when absent (older
  // clients / webhook recovery). For pickup, pickupLocationId names the store
  // and shippingAddress carries that store's address.
  fulfillmentMethod: z.enum(['pickup', 'shipping']).optional(),
  pickupLocationId: optionalSafeText(64).optional(),
  // Signed delivery-quote token from /api/delivery/quote. Carries the raw GIG
  // fee + geocoded coordinates, bound to the shipping address. Absent for
  // pickup orders and free-of-delivery legacy clients.
  deliveryQuoteToken: z.string().trim().max(2000).optional(),
  lines: z.array(cartLineInputSchema).min(1).max(50),
})

// Body for /api/delivery/quote — price a home delivery for a typed address.
export const deliveryQuoteBodySchema = z.object({
  shippingAddress: ngShippingAddressSchema,
  // Order subtotal in MINOR units, for the free-delivery threshold + GIG's
  // declared insurance value. Server re-checks the threshold at payment time,
  // so a tampered value here can't underpay — it only affects the preview.
  subtotalMinor: z.number().int().min(0).max(10_000_000_000),
  itemCount: z.number().int().min(1).max(999),
  // When the address came from autocomplete, the selected place. The quote
  // route resolves it server-side to authoritative coordinates instead of
  // geocoding the typed text.
  placeId: z.string().min(1).max(300).optional(),
  sessionToken: z.string().min(1).max(64).optional(),
})

export const stripeCreateIntentBodySchema = z.object({
  currency: z.enum(['cad', 'CAD']),
  customerName: customerNameSchema,
  customerEmail: emailSchema,
  customerPhone: phoneSchema.optional().or(z.literal('')),
  shippingAddress: intlShippingAddressSchema,
  lines: z.array(cartLineInputSchema).min(1).max(50),
})

export const cartSaveBodySchema = z.object({
  email: emailSchema,
  region: z.enum(['NG', 'CA']),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(['NGN', 'CAD'])),
  subtotalMinor: z.number().int().min(0),
  consentToContact: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required.' }),
  }),
  lines: z
    .array(
      cartLineInputSchema.partial({
        productId: true,
        variantLabel: true,
        currency: true,
      }).extend({
        // /api/cart/save uses unitPriceMinor naming; map either way
        unitPriceMinor: z.number().int().min(0).optional(),
        unitPriceKobo: z.number().int().min(0).optional(),
        handle: z
          .string()
          .trim()
          .max(100)
          .regex(/^[a-zA-Z0-9_-]*$/, 'Invalid handle')
          .optional(),
        thumbnail: z.string().trim().max(2000).url().optional(),
      })
    )
    .min(1)
    .max(50),
})

export const newsletterBodySchema = z.object({
  email: emailSchema,
})

/**
 * Helper: turn a Zod failure into a user-facing message and the first field
 * that failed, so the route can return a useful 400.
 */
export function formatZodError(err: z.ZodError): { message: string; field?: string } {
  const first = err.issues[0]
  if (!first) return { message: 'Invalid input.' }
  const field = first.path.length > 0 ? first.path.join('.') : undefined
  return { message: first.message, field }
}
