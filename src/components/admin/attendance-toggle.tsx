"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY"

interface AttendanceToggleProps {
  value: AttendanceStatus | null
  onChange: (value: AttendanceStatus) => void
  disabled?: boolean
}

export function AttendanceToggle({ value, onChange, disabled }: AttendanceToggleProps) {
  const options: Array<{ label: string; value: AttendanceStatus; colorClass: string; activeColor: string }> = [
    { label: "P", value: "PRESENT", colorClass: "hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/40", activeColor: "bg-green-500 text-white hover:bg-green-600 shadow-sm" },
    { label: "A", value: "ABSENT", colorClass: "hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40", activeColor: "bg-red-500 text-white hover:bg-red-600 shadow-sm" },
    { label: "L", value: "LATE", colorClass: "hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/40", activeColor: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm" },
    { label: "HD", value: "HALF_DAY", colorClass: "hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-900/40", activeColor: "bg-orange-500 text-white hover:bg-orange-600 shadow-sm" },
  ]

  return (
    <div className="flex inline-flex items-center space-x-1 rounded-md border p-1 bg-muted/40">
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 w-8 sm:w-10 items-center justify-center rounded text-xs font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isActive 
                ? option.activeColor
                : cn("text-muted-foreground", option.colorClass),
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title={option.value}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
