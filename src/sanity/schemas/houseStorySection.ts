import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'houseStorySection',
  title: 'House Story Section',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow Text',
      type: 'string',
      description: 'Small text above the main heading'
    }),
    defineField({
      name: 'heading',
      title: 'Main Heading',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'body',
      title: 'Body Text',
      type: 'array',
      of: [{ type: 'block' }]
    }),
    defineField({
      name: 'image',
      title: 'Section Image',
      type: 'image',
      options: {
        hotspot: true
      }
    }),
    defineField({
      name: 'alignment',
      title: 'Content Alignment',
      type: 'string',
      options: {
        list: [
          { title: 'Image Left, Text Right', value: 'image-left' },
          { title: 'Text Left, Image Right', value: 'text-left' },
          { title: 'Centered (Text Only)', value: 'centered' },
          { title: 'Full Bleed Image', value: 'full-bleed' }
        ]
      },
      initialValue: 'image-left'
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Background Color',
      type: 'string',
      options: {
        list: [
          { title: 'Bone (Default)', value: 'bone' },
          { title: 'Mist', value: 'mist' },
          { title: 'Stone', value: 'stone' },
          { title: 'Accent', value: 'accent' }
        ]
      },
      initialValue: 'bone'
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Order in which sections appear on the house story page'
    })
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }]
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'alignment',
      media: 'image',
      order: 'order'
    },
    prepare({ title, subtitle, media, order }) {
      return {
        title: order ? `${order}. ${title}` : title,
        subtitle,
        media
      }
    }
  }
})