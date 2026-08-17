/**
 * Serialise structured data for embedding in an inline
 * `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone is unsafe here: it does not escape `<`, `>` or `&`, so
 * any interpolated value that contains the literal `</script>` (or an HTML
 * comment opener) would terminate the script element and let arbitrary markup
 * through. Escaping those characters as JSON unicode escapes keeps the parsed
 * data byte-for-byte identical for schema.org consumers while guaranteeing the
 * serialised string can never break out of the surrounding tag.
 *
 * U+2028 / U+2029 are also escaped: they are valid in JSON strings but are line
 * terminators in a `<script>` context and can break some parsers.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'))
}
