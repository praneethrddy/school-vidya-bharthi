'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface StatCounterProps {
  value: number
  label: string
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export default function StatCounter({
  value,
  label,
  suffix = '',
  prefix = '',
  duration = 1200,
  className,
}: StatCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const totalFrames = Math.max(Math.floor(duration / 30), 1)
    let frame = 0

    const interval = window.setInterval(() => {
      frame += 1
      const nextValue = Math.round((frame / totalFrames) * value)
      setDisplayValue(nextValue >= value ? value : nextValue)

      if (frame >= totalFrames) {
        window.clearInterval(interval)
      }
    }, 30)

    return () => {
      window.clearInterval(interval)
    }
  }, [duration, value])

  return (
    <div className={cn('rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur', className)}>
      <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        <span>{prefix}</span>
        <span>{displayValue}</span>
        <span>{suffix}</span>
      </p>
      <p className="mt-2 text-sm text-slate-200">{label}</p>
    </div>
  )
}
