import type { ReactNode } from 'react'
import Footer from '@/components/public/footer'
import Navbar from '@/components/public/navbar'
import { getPublicSchoolInfo } from '@/lib/public-site'

export default async function PublicLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const school = await getPublicSchoolInfo()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_24%,#f8fafc_100%)] text-slate-900">
      <Navbar school={school} />
      <main>{children}</main>
      <Footer school={school} />
    </div>
  )
}
