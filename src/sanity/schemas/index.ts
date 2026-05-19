// Document types
import author from './author'
import houseStorySection from './houseStorySection'
import inquiry from './inquiry'
import journalPost from './journalPost'
import navigation from './navigation'
import page from './page'
import pendingCart from './pendingCart'
import review from './review'
import siteSettings from './siteSettings'

export const schemaTypes = [
  // Editorial content
  journalPost,
  author,
  houseStorySection,
  page,

  // B2B & Customer documents
  inquiry,
  review,
  pendingCart,

  // Settings documents (singletons)
  siteSettings,
  navigation,
]