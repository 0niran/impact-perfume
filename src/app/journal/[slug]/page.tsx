import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { PortableText, type PortableTextBlock } from '@portabletext/react'
import { Container } from '@/components/layout'
import { sanity, urlFor } from '@/lib/sanity'
import { journalPostQuery } from '@/sanity/queries'

interface Props {
  params: { slug: string }
}

interface JournalPost {
  _id: string
  title: string
  slug: { current: string }
  category?: string
  excerpt?: string
  hero?: { asset: unknown; alt?: string }
  body?: unknown[]
  publishedAt: string
  author?: { name: string; role?: string; image?: Record<string, unknown>; bio?: string }
  related?: Array<{
    _id: string
    title: string
    slug: { current: string }
    hero?: { asset: unknown; alt?: string }
    publishedAt: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post: JournalPost | null = await sanity.fetch(journalPostQuery, { slug: params.slug })
  if (!post) return {}
  return {
    title: `${post.title} · Impact Perfumes Journal`,
    description: post.excerpt,
    openGraph: post.hero
      ? { images: [{ url: urlFor(post.hero).width(1200).height(630).url() }] }
      : undefined,
  }
}

const portableTextComponents = {
  types: {
    image: ({ value }: { value: { asset: unknown; alt?: string; caption?: string } }) => (
      <figure className="my-10">
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={urlFor(value).width(1200).height(675).url()}
            alt={value.alt ?? ''}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 700px, 100vw"
          />
        </div>
        {value.caption && (
          <figcaption className="mt-3 text-center text-small text-stone">{value.caption}</figcaption>
        )}
      </figure>
    ),
  },
  block: {
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="mt-10 font-display text-h2">{children as React.ReactNode}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mt-8 font-display text-h3">{children as React.ReactNode}</h3>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="mt-6 text-body leading-relaxed text-stone">{children as React.ReactNode}</p>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="my-8 border-l-2 border-accent pl-6 font-display text-h3 italic text-bone">
        {children as React.ReactNode}
      </blockquote>
    ),
  },
}

export default async function JournalPostPage({ params }: Props) {
  const post: JournalPost | null = await sanity.fetch(journalPostQuery, { slug: params.slug })
  if (!post) notFound()

  return (
    <main className="bg-ink text-bone">
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px] bg-stone/20">
        {post.hero && (
          <Image
            src={urlFor(post.hero).width(1600).height(900).url()}
            alt={post.hero.alt ?? post.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 bg-ink/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 text-center">
          <Container>
            {post.category && (
              <p className="text-label uppercase tracking-[0.1em] text-bone/70">{post.category}</p>
            )}
            <h1 className="mt-3 font-display text-h1 text-bone">{post.title}</h1>
            <p className="mt-4 text-small text-bone/60">
              {new Date(post.publishedAt).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {post.author && ` · ${post.author.name}`}
            </p>
          </Container>
        </div>
      </div>

      {/* Body */}
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          {post.excerpt && (
            <p className="font-display text-h3 italic text-stone">{post.excerpt}</p>
          )}
          {post.body && (
            <PortableText value={post.body as PortableTextBlock[]} components={portableTextComponents} />
          )}
        </div>

        {/* Author */}
        {post.author && (
          <div className="mx-auto mt-16 max-w-2xl border-t border-stone/20 pt-10">
            <div className="flex items-start gap-5">
              {post.author.image && (
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={urlFor(post.author.image).width(112).height(112).url()}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              )}
              <div>
                <p className="text-label uppercase tracking-[0.1em]">{post.author.name}</p>
                {post.author.role && (
                  <p className="mt-0.5 text-small text-stone">{post.author.role}</p>
                )}
                {post.author.bio && (
                  <p className="mt-2 text-small text-stone">{post.author.bio}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related posts */}
        {post.related && post.related.length > 0 && (
          <div className="mx-auto mt-20 max-w-4xl">
            <p className="text-label uppercase tracking-[0.1em] text-accent">More from the journal</p>
            <div className="mt-6 grid gap-8 sm:grid-cols-3">
              {post.related.map((rel) => (
                <Link key={rel._id} href={`/journal/${rel.slug.current}`} className="group">
                  <div className="relative aspect-[3/2] overflow-hidden bg-stone/20">
                    {rel.hero && (
                      <Image
                        src={urlFor(rel.hero).width(600).height(400).url()}
                        alt={rel.hero.alt ?? rel.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(min-width: 640px) 33vw, 100vw"
                      />
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-h3 text-bone leading-snug transition-opacity group-hover:opacity-70">
                    {rel.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mx-auto mt-16 max-w-2xl">
          <Link href="/journal" className="text-small text-stone underline-offset-2 hover:text-bone hover:underline">
            ← Back to Journal
          </Link>
        </div>
      </Container>
    </main>
  )
}
