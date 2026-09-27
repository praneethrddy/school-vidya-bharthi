'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const admissionFormSchema = z.object({
  applicant_name: z.string().trim().min(1, 'Applicant name is required').max(200),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  applying_for_class: z.string().trim().min(1, 'Applying class is required').max(50),
  parent_name: z.string().trim().min(1, 'Parent name is required').max(200),
  parent_phone: z.string().trim().min(6, 'Parent phone is required').max(20),
  parent_email: z
    .string()
    .trim()
    .email('Invalid parent email')
    .optional()
    .or(z.literal('')),
  address: z.string().max(2000).optional(),
  previous_school: z.string().max(255).optional(),
  remarks: z.string().max(2000).optional(),
})

type AdmissionFormValues = z.infer<typeof admissionFormSchema>

interface AdmissionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classOptions: Array<{ id: string; label: string }>
  onCreated: () => Promise<void> | void
}

const defaultValues: AdmissionFormValues = {
  applicant_name: '',
  date_of_birth: '',
  gender: 'MALE',
  applying_for_class: '',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  address: '',
  previous_school: '',
  remarks: '',
}

export function AdmissionForm({
  open,
  onOpenChange,
  classOptions,
  onCreated,
}: AdmissionFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
      setSelectedFiles([])
    }
  }, [form, open])

  const handleSubmit = async (values: AdmissionFormValues) => {
    setSubmitting(true)

    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          parent_email: values.parent_email || undefined,
          address: values.address || undefined,
          previous_school: values.previous_school || undefined,
          remarks: values.remarks || undefined,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Failed to create application')
      }

      const admissionId = payload?.data?.id as string | undefined

      if (admissionId && selectedFiles.length > 0) {
        const formData = new FormData()
        selectedFiles.forEach((file) => formData.append('files', file))

        const uploadResponse = await fetch(`/api/admissions/${admissionId}/documents`, {
          method: 'POST',
          body: formData,
        })

        const uploadPayload = await uploadResponse.json().catch(() => null)
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.error?.message || 'Application created but document upload failed')
        }
      }

      if (payload?.data?.duplicate_warning) {
        toast.warning('Similar applicant (same name + DOB) already exists. This is a soft warning only.')
      }

      toast.success('Application created successfully')
      await onCreated()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create application'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
          <DialogDescription>
            Create a new admission application in APPLIED status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="applicant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicant Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applying_for_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applying For Class</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classOptions.length === 0 ? (
                          <SelectItem value="NO_CLASSES_AVAILABLE" disabled>
                            No classes available
                          </SelectItem>
                        ) : (
                          classOptions.map((option) => (
                            <SelectItem key={option.id} value={option.label}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="previous_school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous School (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Remarks (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 space-y-2">
                <FormLabel>Documents (optional)</FormLabel>
                <Input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(event) => {
                    setSelectedFiles(Array.from(event.target.files || []))
                  }}
                />
                <p className="text-xs text-muted-foreground">Allowed: image/*, application/pdf, max 10MB each</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Application
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
