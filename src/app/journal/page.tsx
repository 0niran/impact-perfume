import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/layout'
import { sanity, urlFor } from '@/lib/sanity'
import { journalListQuery } from '@/sanity/queries'

export const metadata: Metadata = {
  title: 'Journal · Impact Perfumes',
  description: 'Scent stories, craft insights, and dispatches from the house.',
}

interface JournalPost {
  _id: string
  title: string
  slug: { current: string }
  category?: string
  excerpt?: string
  hero?: { asset: unknown; alt?: string }
  publishedAt: string
  author?: { name: string; image?: unknown }
}

export default async function JournalPage() {
  const posts: JournalPost[] = await sanity.fetch(journalListQuery, { limit: 24 })

  return (
    <main>
      <div className="bg-mist py-16 text-center">
        <Container>
          <p className="text-label uppercase tracking-[0.1em] text-slate">Journal</p>
          <h1 className="mt-4 font-display text-display-l">Scent & Story</h1>
          <p className="mt-4 text-body text-slate">
            Dispatches from the house — craft, culture, and the world of fragrance.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        {posts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-h2 text-slate">Stories coming soon.</p>
            <p className="mt-3 text-body text-stone">
              We&apos;re preparing our first dispatches from the house.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex h-[52px] items-center bg-ink px-10 text-label uppercase tracking-[0.1em] text-bone transition-opacity hover:opacity-90"
            >
              Explore the collection
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Link
                key={post._id}
                href={`/journal/${post.slug.current}`}
                className="group flex flex-col"
              >
                {/* Hero image */}
                <div className="relative aspect-[3/2] overflow-hidden bg-mist">
                  {post.hero ? (
                    <Image
                      src={urlFor(post.hero).width(800).height(533).url()}
                      alt={post.hero.alt ?? post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      priority={i === 0}
                    />
                  ) : (
                    <div className="h-full w-full bg-mist" />
                  )}
                </div>

                {/* Meta */}
                <div className="mt-5 flex flex-col gap-2">
                  {post.category && (
                    <p className="text-label uppercase tracking-[0.1em] text-slate">
                      {post.category}
                    </p>
                  )}
                  <h2 className="font-display text-h3 leading-snug transition-opacity group-hover:opacity-70">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-small text-slate line-clamp-2">{post.excerpt}</p>
                  )}
                  <p className="text-small text-stone">
                    {new Date(post.publishedAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {post.author && ` · ${post.author.name}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </main>
  )
}
