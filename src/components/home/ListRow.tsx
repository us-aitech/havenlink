import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export function ListRow({
  icon: Icon,
  iconClassName,
  title,
  meta,
  trailing,
  className,
}: {
  icon?: LucideIcon
  iconClassName?: string
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-14 items-center gap-3 py-3', className)}>
      {Icon && <Icon className={cn('size-4 shrink-0 text-fg-3', iconClassName)} />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] leading-5 font-medium text-fg">{title}</div>
        {meta && <div className="truncate text-xs leading-4 text-fg-3">{meta}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  )
}

export function MetaSep() {
  return <span className="mx-1.5 text-fg-4">·</span>
}
