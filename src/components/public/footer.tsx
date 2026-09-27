import Link from 'next/link'
import type { PublicSchoolInfo } from '@/lib/public-site'

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/academics', label: 'Academics' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
  { href: '/alumni', label: 'Alumni' },
]

interface FooterProps {
  school: PublicSchoolInfo
}

export default function Footer({ school }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr_0.75fr] lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            {school.name}
          </p>
          <div className="space-y-2 text-sm leading-7 text-slate-300">
            <p>{school.address}</p>
            <p>
              {school.city}, {school.state}
            </p>
            <p>{school.phone}</p>
            <p>{school.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Quick Links
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-amber-400">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Social
          </p>
          <div className="space-y-2 text-sm text-slate-300">
            <p>Facebook</p>
            <p>Instagram</p>
            <p>YouTube</p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© 2025 Vidhya Bharthi High School. All rights reserved.</p>
          <p>Powered by SchoolOS</p>
        </div>
      </div>
    </footer>
  )
}
