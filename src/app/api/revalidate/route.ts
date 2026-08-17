import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { serverEnv } from '@/lib/env'

/**
 * On-demand ISR invalidation. Use whenever Medusa data changes outside of
 * a deploy (price tweaks, image swaps, new products) and you don't want to
 * wait up to an hour for the cached PDP to refresh.
 *
 * Auth: same CRON_SECRET we already set for the cron route. Pass it via
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Usage:
 *   GET /api/revalidate?path=/no/1
 *   GET /api/revalidate?path=/shop&path=/oils  (repeat ?path for multiple)
 *   GET /api/revalidate?tag=products            (if you start using tags)
 *
 * Returns the list of paths that were flushed.
 */
export async function GET(req: NextRequest) {
  // Fails CLOSED when CRON_SECRET is unset — refusing to flush is better
  // than letting anyone trigger cache regeneration when env vars are
  // misconfigured (audit H-2).
  const secret = serverEnv.cronSecret
  if (!secret) {
    return NextResponse.json({ ok: false, message: 'Revalidation not configured.' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }

  const url = req.nextUrl
  const paths = url.searchParams.getAll('path')
  const tags = url.searchParams.getAll('tag')

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json({ ok: false, message: 'Provide ?path= or ?tag= (repeatable).' }, { status: 400 })
  }

  for (const p of paths) revalidatePath(p)
  for (const t of tags) revalidateTag(t)

  return NextResponse.json({ ok: true, paths, tags })
}
