'use client'

import React, { useState } from 'react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, School, LogOut } from 'lucide-react'
import { NavItem } from './nav-item'
import { signOut } from 'next-auth/react'
import { adminNavItems } from '@/lib/admin-nav'
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  FileUp,
  Calendar,
  UserPlus,
  BookOpen,
  Bus,
  FileText,
  BellRing,
  Settings,
  Shield,
} from 'lucide-react'

const iconMap: Record<string, any> = {
  dashboard: LayoutDashboard,
  students: Users,
  staff: UserCog,
  attendance: ClipboardCheck,
  grades: GraduationCap,
  fees: IndianRupee,
  imports: FileUp,
  timetable: Calendar,
  admissions: UserPlus,
  library: BookOpen,
  transport: Bus,
  circulars: BellRing,
  reports: FileText,
  settings: Settings,
  permissions: Shield,
}

interface AdminMobileNavProps {
  role: string
  permissions: string[]
  schoolName?: string
}

function canViewNavItem(role: string, permissions: string[], required: string[] | null) {
  if (role === 'PRINCIPAL' || role === 'SUPER_ADMIN') {
    return true
  }

  if (required === null) {
    return true
  }

  return required.some((permission) => permissions.includes(permission))
}

export function AdminMobileNav({ role, permissions, schoolName }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false)

  const isPrincipalOrSuper = role === 'PRINCIPAL' || role === 'SUPER_ADMIN'

  const filteredLinks = adminNavItems.filter((item) => {
    if (item.principalOnly && !isPrincipalOrSuper) return false
    return canViewNavItem(role, permissions, item.permissions)
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <VisuallyHidden>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden>
        <div className="flex h-16 items-center px-6 border-b">
          <School className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg">{schoolName || 'Vidhya Bharthi'}</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-4">
            {filteredLinks.map((link) => {
              const Icon = iconMap[link.key] || LayoutDashboard
              return (
                <NavItem
                  key={link.key}
                  title={link.label}
                  href={link.href}
                  icon={Icon}
                  onClick={() => setOpen(false)}
                />
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Log out</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
