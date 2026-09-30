import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type TileTone = 'accent' | 'warning'

const ACTIVE_TILE: Record<TileTone, string> = {
  accent: 'border-accent-line bg-accent-soft',
  warning: 'border-warning-line bg-warning-soft',
}

const ACTIVE_ICON: Record<TileTone, string> = {
  accent: 'text-accent-fg',
  warning: 'text-warning-fg',
}

function tileClass(active: boolean, tone: TileTone, interactive: boolean) {
  return cn(
    'rounded-lg border text-left shadow-xs transition-colors disabled:opacity-60',
    active ? ACTIVE_TILE[tone] : 'border-border bg-surface',
    interactive && !active && 'hover:border-border-strong',
  )
}

export function DeviceTile({
  icon: Icon,
  name,
  state,
  active = false,
  tone = 'warning',
  attention = false,
  onClick,
  disabled,
  pressed,
  trailing,
  iconClassName,
  className,
}: {
  icon: LucideIcon
  name: ReactNode
  state: ReactNode
  active?: boolean
  tone?: TileTone
  attention?: boolean
  onClick?: () => void
  disabled?: boolean
  pressed?: boolean
  trailing?: ReactNode
  iconClassName?: string
  className?: string
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <Icon className={cn('size-5 shrink-0', active ? ACTIVE_ICON[tone] : attention ? 'text-warning-fg' : 'text-fg-3', iconClassName)} />
        {trailing}
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-[13px] leading-5 font-medium text-fg">{name}</span>
        <span className={cn('block truncate text-xs leading-4', attention && !active ? 'text-warning-fg' : 'text-fg-3')}>{state}</span>
      </span>
    </>
  )
  const classes = cn('flex min-h-24 flex-col justify-between gap-3 p-3', tileClass(active, tone, !!onClick), className)
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed} className={classes}>
        {body}
      </button>
    )
  }
  return <div className={classes}>{body}</div>
}

export function SceneTile({
  icon: Icon,
  name,
  description,
  active,
  onClick,
  layout = 'stack',
  className,
}: {
  icon: LucideIcon
  name: string
  description: string
  active: boolean
  onClick: () => void
  layout?: 'stack' | 'row'
  className?: string
}) {
  if (layout === 'row') {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cn('flex items-center gap-3 p-4', tileClass(active, 'accent', true), className)}>
        <Icon className={cn('size-5 shrink-0', active ? 'text-accent-fg' : 'text-fg-3')} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-5 font-medium text-fg">{name}</span>
          <span className="block text-xs leading-4 text-fg-3">{description}</span>
        </span>
        <span className={cn('shrink-0 text-xs font-medium', active ? 'text-accent-fg' : 'text-fg-3')}>{active ? 'Active' : 'Run'}</span>
      </button>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn('flex flex-col items-start gap-3 p-3', tileClass(active, 'accent', true), className)}>
      <Icon className={cn('size-5', active ? 'text-accent-fg' : 'text-fg-3')} />
      <span className="block min-w-0">
        <span className="block text-[13px] leading-5 font-medium text-fg">{name}</span>
        <span className="line-clamp-2 text-xs leading-4 text-fg-3">{description}</span>
      </span>
    </button>
  )
}
