import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { buildTenantCssVariables, getTenantBrandingFromHeaders } from '@/lib/tenant-context'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Vidhya Bharthi High School',
  description: 'School management system for Vidhya Bharthi High School',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const branding = await getTenantBrandingFromHeaders()
  const tenantStyle = buildTenantCssVariables(branding)

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={tenantStyle as CSSProperties}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
