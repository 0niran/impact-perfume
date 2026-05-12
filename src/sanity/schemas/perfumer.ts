import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'perfumer',
  title: 'Perfumer',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'text',
      description: 'Brief biography of the perfumer',
      rows: 4
    }),
    defineField({
      name: 'image',
      title: 'Portrait',
      type: 'image',
      options: {
        hotspot: true
      }
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url'
    }),
    defineField({
      name: 'nationality',
      title: 'Nationality',
      type: 'string'
    })
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'nationality',
      media: 'image'
    }
  }
})