export const latestJournalPostsQuery = `
  *[_type == "journalPost"] | order(publishedAt desc) [0...3] {
    title,
    "slug": slug.current,
    category,
    publishedAt,
    "heroUrl": hero.asset->url
  }
`

export const featuredEditorialQuery = `
  *[_type == "journalPost"] | order(publishedAt desc) [0] {
    title,
    "slug": slug.current,
    category,
    publishedAt,
    "heroUrl": hero.asset->url
  }
`
