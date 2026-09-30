import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { AlertTriangle, CheckCircle2, Info, Siren, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SEVERITY_TONE } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { Severity, Toast } from '@/types'
import { TONE_TEXT } from './ui'

const ICONS: Record<Severity, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: Siren,
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast)
  const tone = SEVERITY_TONE[toast.severity]
  const Icon = ICONS[toast.severity]
  useEffect(() => {
    const id = setTimeout(() => dismiss(toast.id), toast.severity === 'critical' ? 9000 : 6000)
    return () => clearTimeout(id)
  }, [toast.id, toast.severity, dismiss])
  return (
    <div className="pointer-events-auto flex w-full animate-slide-in gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-lg">
      <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[tone])} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] leading-5 font-semibold text-fg">{toast.title}</div>
        {toast.message && <div className="mt-0.5 text-xs leading-relaxed text-fg-3">{toast.message}</div>}
      </div>
      <button onClick={() => dismiss(toast.id)} className="-mt-1 -mr-1 flex size-6 items-center justify-center rounded-md text-fg-4 hover:bg-surface-3 hover:text-fg" aria-label="Dismiss">
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const { pathname } = useLocation()
  const portal = pathname.startsWith('/ops') ? 'ops' : pathname.startsWith('/home') ? 'home' : null
  const visible = toasts.filter((t) => !portal || !t.scope || t.scope === 'both' || t.scope === portal)
  return (
    <div className="pointer-events-none fixed top-3 right-3 left-3 z-[60] flex flex-col items-end gap-2 sm:top-4 sm:right-4 sm:left-auto sm:w-[360px]">
      {visible.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
