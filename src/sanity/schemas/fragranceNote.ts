import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'fragranceNote',
  title: 'Fragrance Note',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Note Name',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'family',
      title: 'Note Family',
      type: 'string',
      options: {
        list: [
          { title: 'Citrus', value: 'citrus' },
          { title: 'Floral', value: 'floral' },
          { title: 'Fruity', value: 'fruity' },
          { title: 'Woody', value: 'woody' },
          { title: 'Spicy', value: 'spicy' },
          { title: 'Green', value: 'green' },
          { title: 'Sweet', value: 'sweet' },
          { title: 'Aromatic', value: 'aromatic' },
          { title: 'Resin', value: 'resin' },
          { title: 'Musk', value: 'musk' }
        ]
      }
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3
    }),
    defineField({
      name: 'image',
      title: 'Note Image',
      type: 'image',
      options: {
        hotspot: true
      }
    })
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'family',
      media: 'image'
    }
  }
})