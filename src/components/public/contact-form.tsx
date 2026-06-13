'use client'

import { useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { publicContactFormSchema, type PublicContactFormValues } from '@/lib/public-site-schemas'

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PublicContactFormValues>({
    resolver: zodResolver(publicContactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      company: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    const response = await fetch('/api/public/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(
        payload?.error?.message || 'We could not send your message right now. Please try again.'
      )
      setIsSubmitting(false)
      return
    }

    toast.success("Thank you! We'll get back to you soon.")
    startTransition(() => {
      reset()
    })
    setIsSubmitting(false)
  })

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" placeholder="Your full name" {...register('name')} />
          {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" placeholder="+91 98765 43210" {...register('phone')} />
          {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-subject">Subject</Label>
          <Input id="contact-subject" placeholder="Admission enquiry" {...register('subject')} />
          {errors.subject ? (
            <p className="text-sm text-red-600">{errors.subject.message}</p>
          ) : null}
        </div>
      </div>

      <div className="hidden" aria-hidden="true">
        <Label htmlFor="contact-company">Company</Label>
        <Input id="contact-company" tabIndex={-1} autoComplete="off" {...register('company')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          rows={6}
          placeholder="Tell us how we can help."
          {...register('message')}
        />
        {errors.message ? <p className="text-sm text-red-600">{errors.message.message}</p> : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="bg-slate-950 text-white hover:bg-slate-800"
        disabled={isSubmitting || isPending}
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}
