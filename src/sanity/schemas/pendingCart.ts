import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'pendingCart',
  title: 'Pending Cart',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Customer Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      options: { list: ['NG', 'CA'] },
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      description: 'ISO 4217, uppercase (NGN, CAD)',
    }),
    defineField({
      name: 'subtotalMinor',
      title: 'Subtotal (smallest unit)',
      type: 'number',
      description: 'kobo for NGN, cents for CAD',
    }),
    defineField({
      name: 'lines',
      title: 'Cart lines',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'variantId', type: 'string' },
            { name: 'productId', type: 'string' },
            { name: 'handle', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'variantLabel', type: 'string' },
            { name: 'qty', type: 'number' },
            { name: 'unitPriceMinor', type: 'number' },
            { name: 'thumbnail', type: 'string' },
          ],
        },
      ],
    }),
    defineField({
      name: 'createdAt',
      title: 'Created',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'lastEmailedAt',
      title: 'Last reminder sent',
      type: 'datetime',
    }),
    defineField({
      name: 'remindersSent',
      title: 'Reminders sent',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Recovered', value: 'recovered' },
          { title: 'Expired', value: 'expired' },
          { title: 'Unsubscribed', value: 'unsubscribed' },
        ],
      },
      initialValue: 'pending',
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'createdAtDesc',
      by: [{ field: 'createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'email', subtitle: 'status', amount: 'subtotalMinor', currency: 'currency' },
    prepare({ title, subtitle, amount, currency }) {
      const formatted = amount != null && currency
        ? `${currency} ${(amount / 100).toFixed(currency === 'NGN' ? 0 : 2)}`
        : ''
      return { title, subtitle: `${subtitle} · ${formatted}` }
    },
  },
})
