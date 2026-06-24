import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'productEnrichment',
  title: 'Product Enrichment',
  type: 'document',
  fields: [
    defineField({
      name: 'productHandle',
      title: 'Product Handle',
      type: 'string',
      description: 'Must match the Medusa product handle (e.g., "no-1", "no-2")',
      validation: Rule => Rule.required()
    }),

    // Number Series specific fields
    defineField({
      name: 'number',
      title: 'Number',
      type: 'number',
      description: 'Number in the series (1-50)',
      validation: Rule => Rule.min(1).max(50)
    }),
    defineField({
      name: 'descriptor',
      title: 'Descriptor',
      type: 'string',
      description: 'e.g., "Fruity", "Sweet Oud"',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'scentFamily',
      title: 'Scent Family',
      type: 'string',
      options: {
        list: [
          'Fruity', 'Warm Spicy', 'Amber', 'Sweet Oud', 'Fresh Spicy', 'Woody',
          'Sweet', 'Citrus', 'Rose', 'Vanilla', 'Oud', 'Leather', 'Aromatic',
          'Floral', 'Coconut', 'Tropical', 'Powdery'
        ]
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'signatureColor',
      title: 'Signature Color (Hex)',
      type: 'string',
      description: 'Hex color code (e.g., #1E64A4)',
      validation: Rule => Rule.regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    }),
    defineField({
      name: 'signatureColorName',
      title: 'Signature Color Name',
      type: 'string',
      description: 'e.g., "Cobalt", "Verdant"'
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Short poetic descriptor (max 80 characters)',
      validation: Rule => Rule.max(80)
    }),

    // Product category
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Number Series', value: 'number-series' },
          { title: 'Perfume Oils', value: 'oils' },
          { title: 'Car Diffusers', value: 'car-diffusers' },
          { title: 'Reed Diffusers', value: 'reed-diffusers' },
          { title: 'Discovery Set', value: 'discovery-set' }
        ]
      },
      validation: Rule => Rule.required()
    }),

    // Fragrance notes
    defineField({
      name: 'topNotes',
      title: 'Top Notes',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'fragranceNote' }] }]
    }),
    defineField({
      name: 'heartNotes',
      title: 'Heart Notes',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'fragranceNote' }] }]
    }),
    defineField({
      name: 'baseNotes',
      title: 'Base Notes',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'fragranceNote' }] }]
    }),

    // Fragrance Finder quiz mapping
    defineField({
      name: 'mood',
      title: 'Mood',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['Calm', 'Magnetic', 'Joyful', 'Mysterious', 'Polished', 'Free']
      }
    }),
    defineField({
      name: 'occasion',
      title: 'Occasion',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['Day', 'Evening', 'Office', 'Date', 'Celebration', 'Travel']
      }
    }),

    // Performance metrics
    defineField({
      name: 'longevity',
      title: 'Longevity',
      type: 'number',
      description: 'Scale of 1-5 (how long it lasts)',
      validation: Rule => Rule.min(1).max(5)
    }),
    defineField({
      name: 'sillage',
      title: 'Sillage',
      type: 'number',
      description: 'Scale of 1-5 (how much it projects)',
      validation: Rule => Rule.min(1).max(5)
    }),

    // Editorial content
    defineField({
      name: 'story',
      title: 'Story',
      type: 'text',
      description: '100-150 words about the fragrance inspiration',
      rows: 4
    }),
    defineField({
      name: 'perfumer',
      title: 'Perfumer',
      type: 'reference',
      to: [{ type: 'perfumer' }]
    }),

    // Additional metadata
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'string',
      initialValue: '100ml'
    }),
    defineField({
      name: 'concentration',
      title: 'Concentration',
      type: 'string',
      initialValue: 'Eau de Parfum'
    })
  ],

  preview: {
    select: {
      title: 'productHandle',
      subtitle: 'descriptor',
      number: 'number'
    },
    prepare({ title, subtitle, number }) {
      return {
        title: number ? `No. ${number}, ${title}` : title,
        subtitle: subtitle
      }
    }
  }
})