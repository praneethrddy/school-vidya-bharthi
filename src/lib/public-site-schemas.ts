import { z } from 'zod'

export const publicContactFormSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Please enter a valid phone number')
    .max(20, 'Phone number is too long'),
  subject: z.string().trim().min(3, 'Please add a subject').max(120),
  message: z
    .string()
    .trim()
    .min(10, 'Please share a little more detail')
    .max(1200, 'Message is too long'),
  company: z.string().optional().default(''),
})

export type PublicContactFormValues = z.infer<typeof publicContactFormSchema>
