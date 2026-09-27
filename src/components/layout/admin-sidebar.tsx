'use client'

import React from 'react'
import { NavItem } from './nav-item'
import { useSidebarStore } from '@/store/sidebar-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  School,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

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

interface AdminSidebarProps {
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

export function AdminSidebar({ role, permissions, schoolName }: AdminSidebarProps) {
  const { isCollapsed, toggleCollapse } = useSidebarStore()

  const isPrincipalOrSuper = role === 'PRINCIPAL' || role === 'SUPER_ADMIN'

  const filteredLinks = adminNavItems.filter((item) => {
    if (item.principalOnly && !isPrincipalOrSuper) return false
    return canViewNavItem(role, permissions, item.permissions)
  })

  return (
    <aside
      className={cn(
        'hidden md:block transition-all duration-300 ease-in-out border-r bg-card',
        isCollapsed ? 'w-[80px]' : 'w-64'
      )}
      style={{ width: isCollapsed ? '80px' : '256px' }}
    >
      <div className="flex h-full flex-col">
        {/* Header / Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2 overflow-hidden">
            <School className="h-6 w-6 flex-shrink-0 text-primary" />
            {!isCollapsed && (
              <span className="font-bold text-lg truncate">{schoolName || 'Vidhya Bharthi'}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto text-muted-foreground"
            onClick={toggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-2">
            {filteredLinks.map((link) => {
              const Icon = iconMap[link.key] || LayoutDashboard
              return (
                <NavItem
                  key={link.key}
                  title={link.label}
                  href={link.href}
                  icon={Icon}
                  isCollapsed={isCollapsed}
                />
              )
            })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t mt-auto">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50',
              isCollapsed && 'justify-center px-0'
            )}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className={cn('h-4 w-4', isCollapsed ? '' : 'mr-2')} />
            {!isCollapsed && <span>Log out</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}
