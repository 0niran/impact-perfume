export const siteSettingsQuery = `*[_type == "siteSettings"][0]`

export const navigationQuery = `*[_type == "navigation"][0]`

export const journalListQuery = `
  *[_type == "journalPost" && publishedAt < now()] | order(publishedAt desc) [0...$limit] {
    _id, title, slug, category, excerpt, hero, publishedAt,
    author->{ name, image }
  }
`

export const journalPostQuery = `
  *[_type == "journalPost" && slug.current == $slug][0] {
    ...,
    author->,
    "related": *[_type == "journalPost" && category == ^.category && _id != ^._id] | order(publishedAt desc) [0...3] {
      _id, title, slug, hero, publishedAt
    }
  }
`

export const houseStoryQuery = `
  *[_type == "houseStorySection"] | order(order asc) {
    _id, eyebrow, heading, body, image, imagePosition, order
  }
`

export const pageBySlugQuery = `*[_type == "page" && slug.current == $slug][0]`

// Reserved for future reviews feature, not yet consumed
export const reviewsForProductQuery = `
  *[_type == "review" && productHandle == $handle && status == "Approved"] | order(submittedAt desc) {
    _id, rating, title, body, photos, verified, customerName, submittedAt
  }
`
