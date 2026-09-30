import { useNavigate } from 'react-router'
import { CheckCircle2, Droplets, Loader2, ShieldAlert, WifiOff, Radio } from 'lucide-react'
import { formatClock } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { Button, Modal } from './ui'
import { PinPad } from './PinPad'

export function CriticalAlertModal() {
  const alert = useStore((s) => s.alert)
  const dismiss = useStore((s) => s.dismissAlert)
  const valve = useStore((s) => s.home.water.valve)
  const backupActive = useStore((s) => s.home.network.backupActive)
  const navigate = useNavigate()
  if (!alert) return null

  const go = (path: string) => {
    dismiss()
    navigate(path)
  }

  if (alert.kind === 'leak') {
    return (
      <Modal
        open
        onClose={dismiss}
        tone="critical"
        icon={Droplets}
        title={alert.title}
        subtitle={`Detected at ${formatClock(alert.at)}`}
        footer={
          <>
            <Button variant="ghost" onClick={dismiss}>
              Dismiss
            </Button>
            <Button variant="primary" onClick={() => go('/home/water')}>
              Open water system
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-2">{alert.message}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="text-xs text-fg-3">Main valve</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              {valve === 'closing' && <Loader2 className="size-4 animate-spin text-warning-fg" />}
              {valve === 'closed' && <CheckCircle2 className="size-4 text-good-fg" />}
              <span className={valve === 'closed' ? 'text-good-fg' : valve === 'closing' ? 'text-warning-fg' : 'text-critical-fg'}>
                {valve === 'closed' ? 'Closed — water off' : valve === 'closing' ? 'Closing…' : 'OPEN'}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="text-xs text-fg-3">Field team</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-fg">
              <CheckCircle2 className="size-4 text-good-fg" />
              Notified
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  if (alert.kind === 'intrusion') {
    return (
      <Modal open onClose={dismiss} tone="critical" icon={ShieldAlert} title={alert.title} subtitle={`Triggered at ${formatClock(alert.at)}`} size="sm">
        <div className="-mx-5 -mt-4 mb-4 animate-siren px-5 py-3 text-sm leading-relaxed text-critical-fg">{alert.message}</div>
        <PinPad compact onSuccess={dismiss} />
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={dismiss}
      tone="warning"
      icon={WifiOff}
      title={alert.title}
      subtitle={`Detected at ${formatClock(alert.at)}`}
      footer={
        <>
          <Button variant="ghost" onClick={dismiss}>
            Dismiss
          </Button>
          <Button variant="primary" onClick={() => go('/home/network')}>
            Track the repair
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-fg-2">{alert.message}</p>
      {backupActive && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-good-line bg-good-soft p-3 text-sm text-good-fg">
          <Radio className="size-4 shrink-0" />
          LTE backup active — security and leak protection online
        </div>
      )}
    </Modal>
  )
}
