import Link from 'next/link'
import { Container } from '@/components/layout'
import { sanity } from '@/lib/sanity'
import { featuredEditorialQuery } from '@/sanity/queries/home'

interface JournalPost {
  title: string
  slug: string
  category?: string
  heroUrl?: string
}

async function getFeaturedPost(): Promise<JournalPost | null> {
  try {
    return await sanity.fetch(featuredEditorialQuery)
  } catch {
    return null
  }
}

export default async function EditorialBreak() {
  const post = await getFeaturedPost()

  return (
    <section
      className="relative overflow-hidden bg-ink text-bone"
      style={{ minHeight: 420 }}
    >
      {post?.heroUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.heroUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-transparent" />

      <Container className="relative flex min-h-[420px] flex-col justify-center section-y">
        <p className="text-label uppercase tracking-[0.12em] text-stone">
          {post?.category ?? 'The Journal'}
        </p>

        {post ? (
          <>
            <h2 className="mt-4 max-w-xl font-display text-h1 md:text-display-l text-balance">
              {post.title}
            </h2>
            <Link
              href={`/journal/${post.slug}`}
              className="mt-8 inline-flex items-center gap-2 text-label uppercase tracking-[0.1em] text-stone hover:text-bone transition-colors duration-200"
            >
              Read the story
            </Link>
          </>
        ) : (
          <>
            <blockquote className="mt-4 max-w-2xl font-display text-h1 md:text-display-l text-balance italic">
              &ldquo;Even an enemy will appreciate the gift of a good-smelling perfume.&rdquo;
            </blockquote>
            <p className="mt-4 text-small text-stone">D.A., Founder · Impact Perfumes</p>
            <Link
              href="/house-story"
              className="mt-8 inline-flex items-center gap-2 text-label uppercase tracking-[0.1em] text-stone hover:text-bone transition-colors duration-200"
            >
              Our story
            </Link>
          </>
        )}
      </Container>
    </section>
  )
}
