import { defineField, defineType } from 'sanity'

/**
 * Idempotency lock for payment fulfilment. Created the first time a payment
 * reference is processed (whether via redirect-verify or webhook). Subsequent
 * attempts to claim the same reference will see the existing doc and skip
 * fulfilment, so we never double-create a Medusa order for one payment.
 *
 * The document `_id` is deterministic: `processed-payment-{reference}`.
 */
export default defineType({
  name: 'processedPayment',
  title: 'Processed Payment',
  type: 'document',
  fields: [
    defineField({
      name: 'reference',
      title: 'Payment reference',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'provider',
      title: 'Provider',
      type: 'string',
      options: {
        list: [
          { title: 'Paystack', value: 'paystack' },
          { title: 'Stripe', value: 'stripe' },
        ],
      },
    }),
    defineField({
      name: 'medusaOrderId',
      title: 'Medusa order id',
      type: 'string',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Which path claimed the lock first',
      options: {
        list: [
          { title: 'Browser verify', value: 'verify' },
          { title: 'Webhook', value: 'webhook' },
        ],
      },
    }),
    defineField({
      name: 'processedAt',
      title: 'Processed at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'processedAtDesc',
      by: [{ field: 'processedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'reference', subtitle: 'provider', date: 'processedAt' },
    prepare({ title, subtitle, date }) {
      return {
        title,
        subtitle: `${subtitle ?? '?'} · ${date ? new Date(date).toLocaleString() : ''}`,
      }
    },
  },
})
