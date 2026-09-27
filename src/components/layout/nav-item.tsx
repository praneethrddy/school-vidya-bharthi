'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface NavItemProps {
  title: string
  href: string
  icon: LucideIcon
  isCollapsed?: boolean
  badgeCount?: number
  onClick?: () => void
}

export function NavItem({ title, href, icon: Icon, isCollapsed, badgeCount, onClick }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)
  
  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
        isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : 'transparent',
        isCollapsed ? 'justify-center' : ''
      )}
    >
      <Icon className={cn('h-4 w-4', isCollapsed ? '' : 'mr-2')} />
      {!isCollapsed && <span>{title}</span>}
      {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
        <Badge className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full" variant="destructive">
          {badgeCount}
        </Badge>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            {title}
            {badgeCount !== undefined && badgeCount > 0 && (
              <Badge variant="destructive" className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                {badgeCount}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}
