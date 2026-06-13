import { handlers } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest, props: { params: Promise<{ nextauth: string[] }> }) {
  await props.params
  return handlers.GET(req)
}

export async function POST(req: NextRequest, props: { params: Promise<{ nextauth: string[] }> }) {
  await props.params
  return handlers.POST(req)
}
