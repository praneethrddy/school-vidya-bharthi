'use client'

import React, { useState } from 'react'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, School, LogOut } from 'lucide-react'
import { NavItem } from './nav-item'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Calendar,
  BookOpen,
  Bell,
  Users,
  User,
} from 'lucide-react'

interface MobileNavProps {
  role?: string
}

export function MobileNav({ role }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const navLinks = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { title: 'Grades', href: '/grades', icon: GraduationCap },
    { title: 'Fees', href: '/fees', icon: IndianRupee },
    { title: 'Timetable', href: '/timetable', icon: Calendar },
    { title: 'Homework', href: '/homework', icon: BookOpen },
    { title: 'Notifications', href: '/notifications', icon: Bell },
  ]
  
  if (role === 'PARENT') {
    navLinks.push({ title: 'PTM', href: '/ptm', icon: Users })
  }

  navLinks.push({ title: 'Profile', href: '/profile', icon: User })

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
          <span className="font-bold text-lg">Vidhya Bharthi</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-4">
            {navLinks.map((link) => (
              <NavItem
                key={link.title}
                title={link.title}
                href={link.href}
                icon={link.icon}
                onClick={() => setOpen(false)}
              />
            ))}
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
