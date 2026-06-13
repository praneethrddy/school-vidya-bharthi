'use client'

import React from 'react'
import { MobileNav } from './mobile-nav'
import { UserMenu } from './user-menu'
import { usePathname } from 'next/navigation'
import { NotificationBadge } from '@/components/shared/notification-badge'

interface PortalHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  }
}

export function PortalHeader({ user }: PortalHeaderProps) {
  const pathname = usePathname()
  
  // Format pathname into title e.g. /dashboard -> Dashboard
  const title = pathname.split('/')[1] 
    ? pathname.split('/')[1].charAt(0).toUpperCase() + pathname.split('/')[1].slice(1)
    : 'Portal'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileNav role={user.role || undefined} />
      
      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-2xl">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {user.role === 'PARENT' && (
          <div className="hidden sm:block" id="parent-child-selector-slot">
            {/* Slot for child selector down the line in feature 11 */}
          </div>
        )}

        <NotificationBadge />
        
        <UserMenu user={user} />
      </div>
    </header>
  )
}
