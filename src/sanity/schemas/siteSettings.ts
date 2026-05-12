import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Site Title',
      type: 'string',
      initialValue: 'Impact Perfumes & Oils'
    }),
    defineField({
      name: 'description',
      title: 'Site Description',
      type: 'text',
      description: 'Used for SEO meta description'
    }),
    defineField({
      name: 'tagline',
      title: 'Brand Tagline',
      type: 'string',
      initialValue: 'Even an enemy will appreciate the gift of a good smelling perfume.'
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: {
        hotspot: true
      }
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      description: 'Small icon for browser tabs'
    }),

    // Shipping & Commerce
    defineField({
      name: 'freeShippingThreshold',
      title: 'Free Shipping Threshold (NGN)',
      type: 'number',
      description: 'Minimum order amount for free shipping'
    }),
    defineField({
      name: 'currency',
      title: 'Primary Currency',
      type: 'string',
      options: {
        list: [
          { title: 'Nigerian Naira (NGN)', value: 'NGN' },
          { title: 'US Dollar (USD)', value: 'USD' }
        ]
      },
      initialValue: 'NGN'
    }),

    // Contact Information
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string'
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string'
    }),
    defineField({
      name: 'address',
      title: 'Business Address',
      type: 'text',
      rows: 3
    }),

    // Social Media
    defineField({
      name: 'socialMedia',
      title: 'Social Media',
      type: 'object',
      fields: [
        defineField({
          name: 'instagram',
          title: 'Instagram',
          type: 'string'
        }),
        defineField({
          name: 'facebook',
          title: 'Facebook',
          type: 'string'
        }),
        defineField({
          name: 'x',
          title: 'X (Twitter)',
          type: 'string'
        }),
        defineField({
          name: 'tiktok',
          title: 'TikTok',
          type: 'string'
        })
      ]
    }),

    // Announcement Bar
    defineField({
      name: 'announcementBar',
      title: 'Announcement Bar',
      type: 'object',
      fields: [
        defineField({
          name: 'enabled',
          title: 'Show Announcement',
          type: 'boolean',
          initialValue: false
        }),
        defineField({
          name: 'text',
          title: 'Announcement Text',
          type: 'string'
        }),
        defineField({
          name: 'link',
          title: 'Link (optional)',
          type: 'string'
        }),
        defineField({
          name: 'backgroundColor',
          title: 'Background Color',
          type: 'string',
          options: {
            list: [
              { title: 'Accent', value: 'accent' },
              { title: 'Ink', value: 'ink' },
              { title: 'Stone', value: 'stone' }
            ]
          },
          initialValue: 'accent'
        })
      ]
    })
  ],
  preview: {
    prepare() {
      return {
        title: 'Site Settings'
      }
    }
  }
})