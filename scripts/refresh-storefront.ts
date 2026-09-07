/**
 * Force the storefront to drop its cached catalogue, immediately.
 *
 * Catalogue reads are memoised for CATALOGUE_TTL_SECONDS, so an edit made in
 * Medusa admin can take up to two minutes to appear. Medusa is supposed to push
 * an invalidation to /api/webhooks/medusa, but until that is wired on the
 * backend this is the manual equivalent:
 *
 *   npm run refresh-storefront
 *
 * Needs, in .env.local:
 *   SITE_URL      (or NEXT_PUBLIC_SITE_URL) — defaults to the production deploy
 *   CRON_SECRET   — the same value the storefront has on Vercel. It is marked
 *                   Sensitive there, so `vercel env pull` returns it empty and
 *                   it has to be copied by hand.
 */
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SITE =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://impact-perfume.vercel.app'

const TOKEN = process.env.CRON_SECRET

// Both caches the admin can affect: the product catalogue, and the bespoke
// pricing config (which lives on its own draft products under its own tag).
const TAGS = ['medusa-catalogue', 'bespoke-config']

async function main() {
  if (!TOKEN) {
    console.error(
      'CRON_SECRET is not set in .env.local.\n' +
        'Copy it from the Vercel project (Settings -> Environment Variables).\n' +
        'It is a Sensitive variable, so `vercel env pull` will not fetch it.'
    )
    process.exit(1)
  }

  // /api/revalidate takes a repeatable ?tag=
  const query = TAGS.map((t) => `tag=${encodeURIComponent(t)}`).join('&')
  const url = `${SITE.replace(/\/$/, '')}/api/revalidate?${query}`
  console.log(`flushing ${TAGS.join(', ')} on ${SITE} …`)

  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } })
  const body = await res.text()

  if (!res.ok) {
    console.error(`failed: HTTP ${res.status}`)
    // 401 means the token does not match the storefront's CRON_SECRET; 503
    // means the storefront has no CRON_SECRET configured at all.
    console.error(body.slice(0, 300))
    process.exit(1)
  }

  console.log('done:', body)
  console.log('\nReload the site — catalogue changes should be visible now.')
}

main().catch((err) => {
  console.error('failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
