import {
  Bell,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Megaphone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type AppNotificationType } from '@/lib/notification-utils'

interface NotificationTypeMeta {
  icon: LucideIcon
  iconClassName: string
  containerClassName: string
}

const TYPE_META: Record<AppNotificationType, NotificationTypeMeta> = {
  ATTENDANCE: {
    icon: ClipboardCheck,
    iconClassName: 'text-blue-700',
    containerClassName: 'bg-blue-100',
  },
  FEE: {
    icon: IndianRupee,
    iconClassName: 'text-orange-700',
    containerClassName: 'bg-orange-100',
  },
  GRADE: {
    icon: GraduationCap,
    iconClassName: 'text-violet-700',
    containerClassName: 'bg-violet-100',
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    iconClassName: 'text-teal-700',
    containerClassName: 'bg-teal-100',
  },
  HOMEWORK: {
    icon: BookOpen,
    iconClassName: 'text-emerald-700',
    containerClassName: 'bg-emerald-100',
  },
  PTM: {
    icon: Users,
    iconClassName: 'text-pink-700',
    containerClassName: 'bg-pink-100',
  },
  GENERAL: {
    icon: Bell,
    iconClassName: 'text-slate-700',
    containerClassName: 'bg-slate-100',
  },
}

export function getNotificationTypeMeta(type: AppNotificationType): NotificationTypeMeta {
  return TYPE_META[type]
}

interface NotificationTypeIconProps {
  type: AppNotificationType
  className?: string
}

export function NotificationTypeIcon({ type, className }: NotificationTypeIconProps) {
  const meta = getNotificationTypeMeta(type)
  const Icon = meta.icon

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        meta.containerClassName,
        className
      )}
    >
      <Icon className={cn('h-5 w-5', meta.iconClassName)} />
    </div>
  )
}
