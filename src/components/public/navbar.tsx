'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { PublicSchoolInfo } from '@/lib/public-site'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/academics', label: 'Academics' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
  { href: '/alumni', label: 'Alumni' },
]

interface NavbarProps {
  school: PublicSchoolInfo
}

export default function Navbar({ school }: NavbarProps) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const isHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24)
    }

    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shellClassName =
    isHome && !isScrolled
      ? 'border-transparent bg-transparent text-white'
      : 'border-slate-200/80 bg-white/90 text-slate-900 shadow-sm backdrop-blur'

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex items-center justify-between rounded-full border px-5 py-3 transition-all duration-300',
            shellClassName
          )}
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-lg font-semibold text-slate-950">
              {school.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.logo_url}
                  alt={school.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                school.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
              )}
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-500">
                {school.board}
              </p>
              <p className="text-sm font-semibold sm:text-base">{school.name}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition hover:text-amber-500',
                  pathname === link.href ? 'text-amber-500' : 'text-inherit/90'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button
              asChild
              variant={isHome && !isScrolled ? 'secondary' : 'default'}
              className={
                isHome && !isScrolled
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-slate-950 text-white hover:bg-slate-800'
              }
            >
              <Link href="/login">Login</Link>
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('lg:hidden', isHome && !isScrolled ? 'text-white hover:bg-white/10' : '')}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-slate-200 bg-white">
              <SheetHeader>
                <SheetTitle>{school.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'rounded-2xl px-4 py-3 text-base font-medium transition hover:bg-slate-100',
                      pathname === link.href ? 'bg-amber-50 text-amber-700' : 'text-slate-800'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button asChild className="mt-4 bg-slate-950 text-white hover:bg-slate-800">
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
