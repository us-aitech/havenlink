import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/workflows'

export type { Tone }

export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-fg-3',
  info: 'text-info-fg',
  accent: 'text-accent-fg',
  good: 'text-good-fg',
  warning: 'text-warning-fg',
  serious: 'text-serious-fg',
  critical: 'text-critical-fg',
}

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-neutral',
  info: 'bg-info',
  accent: 'bg-accent',
  good: 'bg-good',
  warning: 'bg-warning',
  serious: 'bg-serious',
  critical: 'bg-critical',
}

export const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-fg ring-neutral-line',
  info: 'bg-info-soft text-info-fg ring-info-line',
  accent: 'bg-accent-soft text-accent-fg ring-accent-line',
  good: 'bg-good-soft text-good-fg ring-good-line',
  warning: 'bg-warning-soft text-warning-fg ring-warning-line',
  serious: 'bg-serious-soft text-serious-fg ring-serious-line',
  critical: 'bg-critical-soft text-critical-fg ring-critical-line',
}

export const TONE_BORDER: Record<Tone, string> = {
  neutral: 'border-border',
  info: 'border-info-line',
  accent: 'border-accent-line',
  good: 'border-good-line',
  warning: 'border-warning-line',
  serious: 'border-serious-line',
  critical: 'border-critical-line',
}

export function Card({ className, children, onClick, padded = true }: { className?: string; children: ReactNode; onClick?: () => void; padded?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-border bg-surface shadow-xs',
        padded && 'p-5',
        onClick && 'cursor-pointer transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-sm leading-5 font-semibold text-fg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] leading-5 text-fg-3">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-xs hover:bg-accent-hover',
  secondary: 'bg-surface text-fg shadow-xs ring-1 ring-border ring-inset hover:bg-surface-2',
  ghost: 'text-fg-2 hover:bg-surface-3 hover:text-fg',
  danger: 'bg-critical text-white shadow-xs hover:brightness-95',
  success: 'bg-good text-white shadow-xs hover:brightness-95',
  warning: 'bg-warning text-[#1f1300] shadow-xs hover:brightness-95',
}

const BUTTON_SIZE: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-4 text-sm gap-2 rounded-lg',
}

const ICON_ONLY: Record<ButtonSize, string> = {
  xs: 'w-7 px-0',
  sm: 'w-8 px-0',
  md: 'w-9 px-0',
  lg: 'w-10 px-0',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const iconSize = size === 'xs' || size === 'sm' ? 'size-3.5' : 'size-4'
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        !children && ICON_ONLY[size],
        className,
      )}
    >
      {loading ? <Loader2 className={cn(iconSize, 'animate-spin')} /> : Icon && <Icon className={iconSize} />}
      {children}
      {IconRight && <IconRight className={cn(iconSize, 'opacity-70')} />}
    </button>
  )
}

export function IconButton({ icon: Icon, label, className, active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-40',
        active && 'bg-surface-3 text-fg',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

export function Badge({ tone = 'neutral', children, dot, className, icon: Icon }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string; icon?: LucideIcon }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11.5px] leading-none font-medium whitespace-nowrap ring-1 ring-inset', TONE_SOFT[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', TONE_DOT[tone])} />}
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  )
}

export function StatusDot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)}>
      {pulse && <span className={cn('absolute inset-0 animate-pulse-ring rounded-full', TONE_DOT[tone])} />}
      <span className={cn('relative inline-flex size-2 rounded-full', TONE_DOT[tone])} />
    </span>
  )
}

export function Toggle({ checked, onChange, disabled, label, size = 'md', tone = 'accent' }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label?: string; size?: 'sm' | 'md'; tone?: 'accent' | 'good' | 'warning' }) {
  const on = tone === 'good' ? 'bg-good' : tone === 'warning' ? 'bg-warning' : 'bg-accent'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn('relative inline-flex shrink-0 items-center rounded-full transition-colors disabled:opacity-40', size === 'sm' ? 'h-4 w-7' : 'h-5 w-9', checked ? on : 'bg-control-off')}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform',
          size === 'sm' ? 'size-3' : 'size-4',
          checked ? (size === 'sm' ? 'translate-x-3.5' : 'translate-x-[18px]') : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, disabled, className, label }: { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; disabled?: boolean; className?: string; label?: string }) {
  return (
    <input
      type="range"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn('h-1.5 w-full cursor-pointer disabled:opacity-40', className)}
    />
  )
}

export function Stat({ label, value, unit, hint, tone = 'neutral', className }: { label: ReactNode; value: ReactNode; unit?: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: Tone; className?: string }) {
  const valueTone = tone === 'critical' ? 'text-critical-fg' : tone === 'warning' ? 'text-warning-fg' : 'text-fg'
  return (
    <Card className={cn('flex flex-col gap-1 p-4', className)} padded={false}>
      <span className="text-[13px] font-medium text-fg-3">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn('text-2xl leading-8 font-semibold tracking-[-0.02em] tabular', valueTone)}>{value}</span>
        {unit && <span className="text-[13px] font-medium text-fg-3">{unit}</span>}
      </div>
      {hint && <div className="text-xs leading-4 text-fg-3">{hint}</div>}
    </Card>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] font-medium text-fg-3">{eyebrow}</div>}
        <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.015em] text-fg sm:text-2xl sm:leading-8">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-fg-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: LucideIcon
  count?: number
}

export function Segmented<T extends string>({ options, value, onChange, className, size = 'md' }: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="tablist" className={cn('inline-flex max-w-full overflow-x-auto rounded-lg bg-surface-3 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-3 hover:text-fg',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
            {o.count !== undefined && <span className={cn('text-[11px] tabular', active ? 'text-fg-3' : 'text-fg-4')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function ProgressBar({ value, tone = 'accent', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', TONE_DOT[tone])} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

const overlayStack: number[] = []
let overlaySeq = 0

function useOverlay(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const id = ++overlaySeq
    overlayStack.push(id)
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayStack[overlayStack.length - 1] === id) closeRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      const idx = overlayStack.indexOf(id)
      if (idx >= 0) overlayStack.splice(idx, 1)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', tone, icon: Icon }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'; tone?: Tone; icon?: LucideIcon }) {
  useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-overlay" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92vh] w-full animate-slide-up flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-xl',
          size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-1">
          {Icon && (
            <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', tone ? TONE_SOFT[tone] : 'bg-surface-3 text-fg-2 ring-border')}>
              <Icon className="size-[18px]" />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-base leading-6 font-semibold text-fg">{title}</h2>
            {subtitle && <p className="text-[13px] text-fg-3">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mt-1 -mr-1.5" />
        </div>
        {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-overlay" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className={cn('relative flex h-full w-full animate-slide-in flex-col border-l border-border bg-surface shadow-xl', width)}>
        <header className="flex items-start gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-base leading-6 font-semibold text-fg">{title}</div>
            {subtitle && <div className="mt-0.5 text-[13px] text-fg-3">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mt-0.5 -mr-2" />
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-2 px-6 py-3">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

export function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
      <div className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-surface-3 text-fg-3">
        <Icon className="size-[18px]" />
      </div>
      <div className="text-sm font-medium text-fg">{title}</div>
      {message && <div className="max-w-sm text-[13px] text-fg-3">{message}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function KeyValue({ label, value, mono, className }: { label: ReactNode; value: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2 text-[13px]', className)}>
      <span className="text-fg-3">{label}</span>
      <span className={cn('text-right font-medium text-fg', mono && 'font-mono text-xs font-normal')}>{value}</span>
    </div>
  )
}

export function Avatar({ initials, tone = 'neutral', size = 'md', className }: { initials: string; tone?: Tone; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ring-1 ring-inset',
        tone === 'neutral' || tone === 'accent' ? 'bg-surface-3 text-fg-2 ring-border' : TONE_SOFT[tone],
        size === 'sm' ? 'size-6 text-[10px]' : size === 'lg' ? 'size-10 text-[13px]' : 'size-7 text-[11px]',
        className,
      )}
    >
      {initials}
    </span>
  )
}

const FIELD =
  'w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-fg-4 focus:border-accent focus:ring-3 focus:ring-accent/15 focus-visible:outline-none disabled:opacity-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(FIELD, 'h-9', className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(FIELD, 'min-h-24 py-2', className)} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cn(
        FIELD,
        'h-9 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23667085%27 stroke-width=%272%27><path d=%27m6 9 6 6 6-6%27/></svg>")] bg-[length:14px] bg-[right_10px_center] bg-no-repeat pr-8',
        className,
      )}
    >
      {children}
    </select>
  )
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium text-fg-2">{label}</span>
      {children}
      {hint && <span className="text-xs text-fg-3">{hint}</span>}
    </label>
  )
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-sm font-semibold text-fg">{children}</h2>
      {action}
    </div>
  )
}
