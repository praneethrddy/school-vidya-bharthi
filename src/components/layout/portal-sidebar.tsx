'use client'

import React from 'react'
import { NavItem } from './nav-item'
import { useSidebarStore } from '@/store/sidebar-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  School
} from 'lucide-react'
import { signOut } from 'next-auth/react'

interface PortalSidebarProps {
  role?: string
}

export function PortalSidebar({ role }: PortalSidebarProps) {
  const { isCollapsed, toggleCollapse } = useSidebarStore()

  // Define nav links based on role (STUDENT, PARENT)
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
    <aside
      className={cn(
        'hidden md:block transition-all duration-300 ease-in-out border-r bg-card',
        isCollapsed ? 'w[80px]' : 'w-64'
      )}
      style={{ width: isCollapsed ? '80px' : '256px' }}
    >
      <div className="flex h-full flex-col">
        {/* Header / Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2 overflow-hidden">
            <School className="h-6 w-6 flex-shrink-0 text-primary" />
            {!isCollapsed && <span className="font-bold text-lg truncate">Vidhya Bharthi</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto text-muted-foreground"
            onClick={toggleCollapse}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-2">
            {navLinks.map((link) => (
              <NavItem
                key={link.title}
                title={link.title}
                href={link.href}
                icon={link.icon}
                isCollapsed={isCollapsed}
              />
            ))}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t mt-auto">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
              isCollapsed && "justify-center px-0"
            )}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
            {!isCollapsed && <span>Log out</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}
