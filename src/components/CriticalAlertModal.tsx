import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { CheckCircle2, CircleAlert, Droplets, Loader2, Radio, ShieldAlert, WifiOff } from 'lucide-react'
import { formatClock } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { Button, Modal } from './ui'
import { PinPad } from './PinPad'

function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
      <span className="text-fg-3">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">{children}</span>
    </div>
  )
}

export function CriticalAlertModal() {
  const alert = useStore((s) => s.alert)
  const dismiss = useStore((s) => s.dismissAlert)
  const valve = useStore((s) => s.home.water.valve)
  const autoShutoff = useStore((s) => s.home.water.settings.autoShutoff)
  const notifyOps = useStore((s) => s.home.water.settings.notifyOps)
  const setValve = useStore((s) => s.setValve)
  const backupActive = useStore((s) => s.home.network.backupActive)
  const navigate = useNavigate()
  const { pathname } = useLocation()
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
          valve !== 'open' && pathname === '/home/water' ? (
            <Button variant="primary" onClick={dismiss}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={dismiss}>
                Dismiss
              </Button>
              {valve === 'open' ? (
                <Button variant="danger" onClick={() => setValve(false)}>
                  Close main valve
                </Button>
              ) : (
                <Button variant="primary" onClick={() => go('/home/water')}>
                  View water system
                </Button>
              )}
            </>
          )
        }
      >
        <p className="text-sm leading-relaxed text-fg-2">{alert.message}</p>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          <StatusRow label="Main valve">
            {valve === 'closed' && (
              <>
                <CheckCircle2 className="size-4 text-good-fg" />
                <span className="text-good-fg">Closed, water off</span>
              </>
            )}
            {valve === 'closing' && (
              <>
                <Loader2 className="size-4 animate-spin text-warning-fg" />
                <span className="text-warning-fg">Closing</span>
              </>
            )}
            {(valve === 'open' || valve === 'opening') && (
              <>
                <CircleAlert className="size-4 text-critical-fg" />
                <span className="text-critical-fg">Open</span>
              </>
            )}
          </StatusRow>
          <StatusRow label="Automatic shut-off">
            <span className={autoShutoff ? 'text-fg' : 'text-warning-fg'}>{autoShutoff ? 'On' : 'Off'}</span>
          </StatusRow>
          <StatusRow label="Field-services team">
            {notifyOps ? (
              <>
                <CheckCircle2 className="size-4 text-good-fg" />
                <span className="text-fg">Notified</span>
              </>
            ) : (
              <span className="text-fg-3">Not notified</span>
            )}
          </StatusRow>
        </div>
      </Modal>
    )
  }

  if (alert.kind === 'intrusion') {
    return (
      <Modal
        open
        onClose={dismiss}
        tone="critical"
        icon={ShieldAlert}
        title={alert.title}
        subtitle={`Triggered at ${formatClock(alert.at)}`}
        size="sm"
        footer={
          pathname === '/home/security' ? undefined : (
            <Button variant="ghost" size="sm" onClick={() => go('/home/security')}>
              Open security
            </Button>
          )
        }
      >
        <div className="-mx-5 -mt-4 mb-5 animate-siren border-y border-critical-line px-5 py-3 text-[13px] leading-relaxed text-critical-fg">{alert.message}</div>
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
        pathname === '/home/network' ? (
          <Button variant="primary" onClick={dismiss}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={dismiss}>
              Dismiss
            </Button>
            <Button variant="primary" onClick={() => go('/home/network')}>
              Track the repair
            </Button>
          </>
        )
      }
    >
      <p className="text-sm leading-relaxed text-fg-2">{alert.message}</p>
      {backupActive && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-good-soft px-3 py-2.5 text-[13px] text-good-fg">
          <Radio className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">LTE backup active.</span> Alarm, cameras and leak protection stay online.
          </span>
        </div>
      )}
    </Modal>
  )
}
