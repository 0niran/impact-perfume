import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { sanity } from '@/lib/sanity'
import { latestJournalPostsQuery } from '@/sanity/queries/home'
import JournalCard from './JournalCard'

interface JournalPost {
  title: string
  slug: string
  category?: string
  publishedAt?: string
  heroUrl?: string
}

async function getLatestPosts(): Promise<JournalPost[]> {
  try {
    return await sanity.fetch(latestJournalPostsQuery)
  } catch {
    return []
  }
}

export default async function JournalPreview() {
  const posts = await getLatestPosts()

  if (!posts.length) return null

  return (
    <Section bg="bg-ink border-t border-stone/20">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-h1 text-bone">From the Journal</h2>
          <Link
            href="/journal"
            className="link-underline text-small text-stone hover:text-bone"
          >
            All posts →
          </Link>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <JournalCard key={post.slug} {...post} />
          ))}
        </div>
      </Container>
    </Section>
  )
}
