import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'inquiry',
  title: 'B2B Inquiry',
  type: 'document',
  fields: [
    defineField({
      name: 'type',
      title: 'Inquiry Type',
      type: 'string',
      options: {
        list: [
          { title: 'Bespoke Bottles', value: 'bespoke' },
          { title: 'Scenting Solutions', value: 'scenting' },
          { title: 'Partnerships', value: 'partnerships' },
          { title: 'General', value: 'general' }
        ]
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'name',
      title: 'Contact Name',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().email()
    }),
    defineField({
      name: 'company',
      title: 'Company',
      type: 'string'
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string'
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      rows: 5,
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'In Progress', value: 'in-progress' },
          { title: 'Responded', value: 'responded' },
          { title: 'Closed', value: 'closed' }
        ]
      },
      initialValue: 'new'
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      description: 'Internal notes for team use'
    })
  ],
  orderings: [
    {
      title: 'Newest First',
      name: 'submittedAtDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }]
    }
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'type',
      status: 'status',
      email: 'email'
    },
    prepare({ title, subtitle, status, email }) {
      return {
        title: `${title} (${email})`,
        subtitle: `${subtitle} • ${status}`
      }
    }
  }
})