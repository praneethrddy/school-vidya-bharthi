import { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Reset Password — Vidhya Bharthi High School',
  description: 'Set a new password',
}

export default async function ResetPasswordPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await props.searchParams // Next.js 15 async constraints
  return <ResetPasswordForm />
}
