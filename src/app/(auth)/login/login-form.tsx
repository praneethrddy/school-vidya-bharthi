'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { getRedirectPath } from '@/lib/auth-redirect'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)

    try {
      const callbackUrl = searchParams.get('callbackUrl')
      const res = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (res?.error) {
        const normalizedError =
          res.error === 'CredentialsSignin' ||
          res.error === 'CallbackRouteError' ||
          res.error === 'Configuration'
            ? 'Invalid email or password'
            : res.error

        toast.error(normalizedError)
      } else {
        toast.success('Login successful')
        const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' })
        const session = await sessionRes.json()
        let destination = '/dashboard'

        if (callbackUrl && callbackUrl !== '/login') {
          destination = callbackUrl
        } else if (session?.user?.role) {
          destination = getRedirectPath(session.user.role)
        }

        const isJsdom =
          typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')

        if (isJsdom) {
          router.push(destination)
          router.refresh()
          return
        }

        router.push(destination)
        router.refresh()
        window.location.assign(destination)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox id="remember" />
            <span>Remember me</span>
          </label>
          <a href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot Password?
          </a>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={isLoading}
          onClick={form.handleSubmit(onSubmit)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </Button>
      </form>
    </Form>
  )
}
