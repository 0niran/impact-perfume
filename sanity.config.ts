import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './src/sanity/schemas'

export default defineConfig({
  name: 'impact-perfumes',
  title: 'Impact Perfumes',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  basePath: '/studio',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem().title('Shop').child(
              S.list().title('Shop').items([
                S.documentTypeListItem('productEnrichment').title('Product Enrichment'),
                S.documentTypeListItem('perfumer').title('Perfumers'),
                S.documentTypeListItem('fragranceNote').title('Fragrance Notes'),
              ])
            ),
            S.listItem().title('Content').child(
              S.list().title('Content').items([
                S.documentTypeListItem('journalPost').title('Journal Posts'),
                S.documentTypeListItem('author').title('Authors'),
                S.documentTypeListItem('houseStorySection').title('House Story Sections'),
                S.documentTypeListItem('page').title('Pages'),
              ])
            ),
            S.listItem().title('Operations').child(
              S.list().title('Operations').items([
                S.documentTypeListItem('inquiry').title('B2B Inquiries'),
                S.documentTypeListItem('review').title('Reviews'),
                S.documentTypeListItem('processedPayment').title('Processed Payments'),
              ])
            ),
            S.listItem().title('Settings').child(
              S.list().title('Settings').items([
                S.documentTypeListItem('siteSettings').title('Site Settings'),
                S.documentTypeListItem('navigation').title('Navigation'),
              ])
            ),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
})
