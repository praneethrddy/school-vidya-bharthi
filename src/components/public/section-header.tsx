import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  as?: 'h1' | 'h2'
  className?: string
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  as = 'h2',
  className,
}: SectionHeaderProps) {
  const HeadingTag = as

  return (
    <div
      className={cn(
        'space-y-3',
        align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl',
        className
      )}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
          {eyebrow}
        </p>
      ) : null}
      <div className="space-y-2">
        <HeadingTag className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </HeadingTag>
        {description ? (
          <p className="text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
