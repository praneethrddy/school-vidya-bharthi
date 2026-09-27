import { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password — Vidhya Bharthi High School',
  description: 'Reset your password',
}

export default async function ForgotPasswordPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await props.searchParams // Next.js 15 async constraints
  return <ForgotPasswordForm />
}
