import { timingSafeEqual } from 'node:crypto'

/**
 * Compare an `Authorization: Bearer …` header against a shared secret.
 *
 * Two reasons this exists rather than `header === \`Bearer ${secret}\``:
 *
 * 1. WHITESPACE. A secret pasted into a hosting dashboard very easily picks up
 *    a trailing newline or space. An exact comparison then fails forever, with
 *    a 401 that looks identical to a genuinely wrong token — there is nothing
 *    in the response to tell the two apart, and the value usually cannot be
 *    read back to check. Both sides are trimmed so an invisible character stops
 *    being an unfixable mystery.
 *
 * 2. TIMING. A character-by-character string compare returns faster the earlier
 *    it finds a difference. That is a poor way to guard an endpoint anyone can
 *    call, so the compare is constant-time.
 *
 * Fails closed: no secret configured means nothing authenticates.
 */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim()
  if (!expected) return false

  const provided = header?.trim()
  if (!provided) return false

  // Scheme is case-insensitive per RFC 7235; the token is not.
  const match = /^Bearer\s+(.*)$/i.exec(provided)
  if (!match) return false
  const token = match[1].trim()

  const a = Buffer.from(token, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  // timingSafeEqual throws on a length mismatch, so check first. Length is not
  // the secret, and an attacker learns nothing useful from it.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
