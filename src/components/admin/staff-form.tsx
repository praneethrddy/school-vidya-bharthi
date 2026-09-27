'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Copy, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const staffFormSchema = z
  .object({
    employee_code: z.string().trim().min(1, 'Employee code is required'),
    first_name: z.string().trim().min(1, 'First name is required'),
    last_name: z.string().trim().min(1, 'Last name is required'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    date_of_birth: z.date().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    date_of_joining: z.date().optional(),
    qualification: z.string().optional(),
    create_account: z.boolean().default(false),
    email: z.string().optional(),
    role: z.enum(['STAFF_ADMIN', 'STUDENT_ADMIN', 'ACCOUNTANT', 'TEACHER']).optional(),
    auto_generate_password: z.boolean().default(true),
    password: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.create_account) {
      return
    }

    if (!value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required when creating an account',
      })
    } else if (!/^\S+@\S+\.\S+$/.test(value.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Invalid email',
      })
    }

    if (!value.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: 'Role is required when creating an account',
      })
    }

    if (!value.auto_generate_password && (!value.password || value.password.length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password must be at least 8 characters',
      })
    }
  })

export type StaffFormValues = z.infer<typeof staffFormSchema>

interface StaffFormProps {
  initialData?: Partial<StaffFormValues>
  onSubmit: (data: StaffFormValues) => Promise<{ generatedPassword?: string | null } | void>
  isEditMode?: boolean
  onCancel?: () => void
}

function normalizeString(value?: string | null) {
  if (value === undefined || value === null) {
    return ''
  }
  return value
}

export function StaffForm({
  initialData,
  onSubmit,
  isEditMode = false,
  onCancel,
}: StaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: initialData
      ? {
          employee_code: normalizeString(initialData.employee_code),
          first_name: normalizeString(initialData.first_name),
          last_name: normalizeString(initialData.last_name),
          gender: initialData.gender,
          date_of_birth: initialData.date_of_birth
            ? new Date(initialData.date_of_birth)
            : undefined,
          phone: normalizeString(initialData.phone),
          address: normalizeString(initialData.address),
          designation: normalizeString(initialData.designation),
          department: normalizeString(initialData.department),
          date_of_joining: initialData.date_of_joining
            ? new Date(initialData.date_of_joining)
            : undefined,
          qualification: normalizeString(initialData.qualification),
          create_account: false,
          email: '',
          role: undefined,
          auto_generate_password: true,
          password: '',
        }
      : {
          employee_code: '',
          first_name: '',
          last_name: '',
          gender: undefined,
          date_of_birth: undefined,
          phone: '',
          address: '',
          designation: '',
          department: '',
          date_of_joining: undefined,
          qualification: '',
          create_account: false,
          email: '',
          role: undefined,
          auto_generate_password: true,
          password: '',
        },
  })

  const createAccount = form.watch('create_account')
  const autoGeneratePassword = form.watch('auto_generate_password')

  async function handleSubmit(data: StaffFormValues) {
    setIsSubmitting(true)
    setGeneratedPassword(null)

    try {
      const result = await onSubmit(data)
      if (!isEditMode && result?.generatedPassword) {
        setGeneratedPassword(result.generatedPassword)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (generatedPassword) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Staff Account Created</CardTitle>
          <CardDescription className="text-green-700">
            Save this generated password now. It will not be shown again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 rounded border bg-white p-4">
            <code className="text-lg font-bold tracking-wider">{generatedPassword}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(generatedPassword)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
          <Button className="mt-6" onClick={() => (window.location.href = '/admin/staff')}>
            Return to Staff List
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Doe" />
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
                  <Select
                    value={field.value ?? 'UNSET'}
                    onValueChange={(value) => field.onChange(value === 'UNSET' ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNSET">Not specified</SelectItem>
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
              name="date_of_birth"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Date of Birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+91..." />
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Residential address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="employee_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="EMP-1001" disabled={isEditMode} />
                  </FormControl>
                  <FormDescription>Unique within the school.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_of_joining"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Date of Joining</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Science / Administration / Accounts" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Senior Teacher" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Qualification</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="M.Sc, B.Ed." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {!isEditMode ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>User Account (Optional)</CardTitle>
                <CardDescription>Create a login account for this staff member.</CardDescription>
              </div>
              <FormField
                control={form.control}
                name="create_account"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!m-0">Enable Login</FormLabel>
                  </FormItem>
                )}
              />
            </CardHeader>

            {createAccount ? (
              <CardContent className="grid grid-cols-1 gap-6 border-t pt-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="staff@school.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Role</FormLabel>
                      <Select
                        value={field.value ?? 'UNSET'}
                        onValueChange={(value) => field.onChange(value === 'UNSET' ? undefined : value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UNSET">Select role</SelectItem>
                          <SelectItem value="TEACHER">Teacher</SelectItem>
                          <SelectItem value="STAFF_ADMIN">Staff Admin</SelectItem>
                          <SelectItem value="STUDENT_ADMIN">Student Admin</SelectItem>
                          <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-lg bg-muted/50 p-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="auto_generate_password"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-generate password</FormLabel>
                          <FormDescription>
                            A strong random password will be shown one-time after creation.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!autoGeneratePassword ? (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormDescription>Minimum 8 characters.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel ?? (() => window.history.back())}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditMode ? 'Save Changes' : 'Create Staff'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

