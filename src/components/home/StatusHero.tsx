import type { ReactNode } from 'react'
import { StatusDot, TONE_TEXT, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'

export type HeroTint = 'critical' | 'warning' | null

export const HERO_CARD: Record<'critical' | 'warning', string> = {
  critical: 'border-critical-line!',
  warning: 'border-warning-line!',
}

export const HERO_TINT: Record<'critical' | 'warning', string> = {
  critical: 'bg-critical-soft',
  warning: 'bg-warning-soft',
}

export function StatusHero({
  tone,
  label,
  title,
  description,
  actions,
  pulse,
  aside,
  className,
}: {
  tone: Tone
  label: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  pulse?: boolean
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6', className)}>
      <div className="min-w-0">
        <div className={cn('flex items-center gap-2 text-[13px] font-medium', TONE_TEXT[tone])}>
          <StatusDot tone={tone} pulse={pulse} />
          {label}
        </div>
        <h2 className="mt-2 text-xl leading-7 font-semibold tracking-[-0.015em] text-fg">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-fg-2">{description}</p>}
        {aside}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
