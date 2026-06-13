import { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Login — Vidhya Bharthi High School',
  description: 'Login to your account',
}

export default async function LoginPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await props.searchParams // Next.js 15 async constraints
  return <LoginForm />
}
