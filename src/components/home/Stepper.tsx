import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface StepItem {
  key: string
  label: string
  meta?: ReactNode
}

type StepState = 'done' | 'current' | 'todo'

function StepDot({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center rounded-full bg-surface ring-2 ring-accent ring-inset">
        <span className="absolute inset-1 animate-pulse-ring rounded-full bg-accent" />
        <span className="relative size-1.5 rounded-full bg-accent" />
      </span>
    )
  }
  return <span className="size-4 shrink-0 rounded-full bg-surface ring-1 ring-border-strong ring-inset" />
}

export function Stepper({ steps, current, complete = false, className }: { steps: StepItem[]; current: number; complete?: boolean; className?: string }) {
  return (
    <ol className={cn('flex flex-col md:flex-row', className)}>
      {steps.map((step, i) => {
        const state: StepState = complete || i < current ? 'done' : i === current ? 'current' : 'todo'
        const last = i === steps.length - 1
        return (
          <li key={step.key} aria-current={state === 'current' ? 'step' : undefined} className="flex min-w-0 gap-3 md:flex-1 md:flex-col md:gap-2.5">
            <div className="flex flex-col items-center md:flex-row">
              <StepDot state={state} />
              {!last && <span className={cn('my-1 min-h-3 w-px flex-1 md:mx-2 md:my-0 md:h-px md:min-h-0 md:w-auto', complete || i < current ? 'bg-accent' : 'bg-border-strong')} />}
            </div>
            <div className={cn('min-w-0 md:pr-3', !last && 'pb-4 md:pb-0')}>
              <div className={cn('text-[13px] leading-4', state === 'current' ? 'font-medium text-fg' : state === 'done' ? 'text-fg-2' : 'text-fg-3')}>{step.label}</div>
              {step.meta && <div className="mt-1 text-xs leading-4 text-fg-3 tabular">{step.meta}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function StepBar({ total, current, complete = false, className }: { total: number; current: number; complete?: boolean; className?: string }) {
  return (
    <div className={cn('flex gap-1', className)} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={complete ? total : current + 1}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', complete ? 'bg-good' : i <= current ? 'bg-accent' : 'bg-surface-3')} />
      ))}
    </div>
  )
}
