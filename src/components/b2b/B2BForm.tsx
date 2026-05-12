'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { cn } from '@/lib/cn'
import { submitInquiry, type InquiryFormData } from '@/app/b2b/actions'

const ENQUIRY_TYPES = [
  { value: 'bespoke', label: 'Bespoke Bottles' },
  { value: 'scenting', label: 'Scenting Solutions (Hotels, Spas)' },
  { value: 'partnerships', label: 'Retail Partnerships' },
  { value: 'general', label: 'General Enquiry' },
]

const inputClass =
  'w-full border border-stone/40 bg-transparent px-4 py-3 text-body text-ink placeholder:text-stone/60 focus:border-ink focus:outline-none transition-colors duration-150'

const labelClass = 'block text-label uppercase tracking-[0.08em] text-slate'

export default function B2BForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InquiryFormData>({
    defaultValues: { type: 'general' },
  })

  async function onSubmit(data: InquiryFormData) {
    setStatus('loading')
    setServerError('')
    const result = await submitInquiry(data)
    if (result.ok) {
      setStatus('success')
      reset()
    } else {
      setStatus('error')
      setServerError(result.error ?? 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <p className="font-display text-h1">We&apos;ve received your enquiry.</p>
        <p className="text-body text-slate">
          Someone from the team will be in touch within 24 hours.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-2 text-small text-accent underline-offset-2 hover:underline"
        >
          Submit another enquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {/* Enquiry type */}
      <div>
        <label className={labelClass}>Enquiry type *</label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ENQUIRY_TYPES.map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer items-center gap-3 border border-stone/40 px-4 py-3 has-[:checked]:border-ink transition-colors duration-150"
            >
              <input
                type="radio"
                value={t.value}
                {...register('type', { required: true })}
                className="accent-ink"
              />
              <span className="text-small">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Name + company */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="b2b-name" className={labelClass}>
            Contact name *
          </label>
          <input
            id="b2b-name"
            type="text"
            placeholder="Your name"
            className={cn(inputClass, 'mt-2', errors.name && 'border-error')}
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && (
            <p className="mt-1 text-small text-error">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="b2b-company" className={labelClass}>
            Company
          </label>
          <input
            id="b2b-company"
            type="text"
            placeholder="Company or hotel name"
            className={cn(inputClass, 'mt-2')}
            {...register('company')}
          />
        </div>
      </div>

      {/* Email + phone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="b2b-email" className={labelClass}>
            Email *
          </label>
          <input
            id="b2b-email"
            type="email"
            placeholder="you@company.com"
            className={cn(inputClass, 'mt-2', errors.email && 'border-error')}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-small text-error">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="b2b-phone" className={labelClass}>
            Phone
          </label>
          <input
            id="b2b-phone"
            type="tel"
            placeholder="+234 800 000 0000"
            className={cn(inputClass, 'mt-2')}
            {...register('phone')}
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="b2b-message" className={labelClass}>
          Tell us about your needs *
        </label>
        <textarea
          id="b2b-message"
          rows={5}
          placeholder="Describe your requirement — volumes, occasion, timeline, or anything else we should know."
          className={cn(inputClass, 'mt-2 resize-none', errors.message && 'border-error')}
          {...register('message', { required: 'Please describe your requirement' })}
        />
        {errors.message && (
          <p className="mt-1 text-small text-error">{errors.message.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-small text-error">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex items-center justify-center self-start bg-ink px-10 text-label uppercase tracking-[0.1em] text-bone transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ height: 52 }}
      >
        {status === 'loading' ? 'Sending…' : 'Submit enquiry'}
      </button>
    </form>
  )
}
