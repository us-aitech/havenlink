import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Cable,
  DoorOpen,
  Droplet,
  Droplets,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  SignalLow,
  TicketPlus,
  Waves,
  PackagePlus,
  X,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { PARTNERS } from '@/config'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import type { PartnerId, ScenarioKey } from '@/types'
import { Button, Select, TONE_TEXT, type Tone } from './ui'

interface ScenarioDef {
  key: ScenarioKey
  label: string
  hint: string
  icon: LucideIcon
  tone: Tone
  view: { label: string; path: string }
}

const GROUPS: Array<{ title: string; items: ScenarioDef[] }> = [
  {
    title: 'Water protection',
    items: [
      { key: 'burst-pipe', label: 'Burst pipe', hint: '~10 GPM spike → auto shut-off in 3s', icon: Waves, tone: 'critical', view: { label: 'Water', path: '/home/water' } },
      { key: 'slow-leak', label: 'Hidden slow leak', hint: 'Constant 0.4 GPM → caught at 30 min', icon: Droplet, tone: 'warning', view: { label: 'Water', path: '/home/water' } },
      { key: 'sensor-wet', label: 'Water heater leaking', hint: 'Leak sensor gets wet → instant shut-off', icon: Droplets, tone: 'critical', view: { label: 'Water', path: '/home/water' } },
    ],
  },
  {
    title: 'Security',
    items: [
      { key: 'intrusion', label: 'Break-in via lanai door', hint: 'Arms Away, opens slider → siren', icon: ShieldAlert, tone: 'critical', view: { label: 'Security', path: '/home/security' } },
      { key: 'entry-door', label: 'Front door opened while armed', hint: '15s entry delay → disarm with PIN', icon: DoorOpen, tone: 'warning', view: { label: 'Security', path: '/home/security' } },
    ],
  },
  {
    title: 'Fiber network',
    items: [
      { key: 'fiber-cut', label: 'Fiber cut in the street', hint: 'LOS on 8 homes → P1 emergency, LTE failover', icon: Cable, tone: 'critical', view: { label: 'Ops network', path: '/ops/network' } },
      { key: 'signal-degradation', label: 'Dirty connector (low light)', hint: 'Rx drops to -28 dBm → P2 trouble call', icon: SignalLow, tone: 'warning', view: { label: 'Internet', path: '/home/network' } },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'isp-trouble-ticket', label: 'ISP dispatches a trouble ticket', hint: 'NOC ticket lands in the work-order queue', icon: TicketPlus, tone: 'info', view: { label: 'Work orders', path: '/ops/work-orders' } },
      { key: 'install-request', label: 'Resident requests an upgrade', hint: 'Cameras + blinds install request', icon: PackagePlus, tone: 'accent', view: { label: 'Installs', path: '/ops/installs' } },
    ],
  },
]

export function SimulatorPanel() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<ScenarioDef | null>(null)
  const navigate = useNavigate()
  const run = useStore((s) => s.runScenario)
  const running = useStore((s) => s.sim.running)
  const setRunning = useStore((s) => s.setRunning)
  const reset = useStore((s) => s.resetDemo)
  const partnerId = useStore((s) => s.settings.partnerId)
  const setPartner = useStore((s) => s.setPartner)

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'fixed right-4 bottom-20 z-40 flex h-10 items-center gap-2 rounded-full border border-border bg-surface pr-3.5 pl-3 text-[13px] font-medium text-fg shadow-lg transition-colors hover:bg-surface-2 lg:right-6 lg:bottom-6',
          open && 'bg-surface-3',
        )}
      >
        <FlaskConical className="size-4 text-fg-3" />
        <span className="hidden sm:inline">Demo controls</span>
        <span className={cn('size-1.5 rounded-full', running ? 'bg-good' : 'bg-neutral')} />
      </button>
      {open && (
        <div className="fixed right-4 bottom-32 left-4 z-40 flex max-h-[min(640px,72vh)] animate-slide-up flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:left-auto sm:w-[380px] lg:right-6 lg:bottom-20">
          <div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg">Demo controls</span>
                <span className="rounded border border-border px-1 text-[10px] leading-4 font-medium text-fg-3">SIMULATION</span>
              </div>
              <div className="mt-0.5 text-xs text-fg-3">Trigger field events to see both portals react.</div>
            </div>
            <button onClick={() => setOpen(false)} className="-mt-0.5 -mr-1 flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-3" aria-label="Close demo controls">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {last && (
              <button
                onClick={() => {
                  navigate(last.view.path)
                  setOpen(false)
                }}
                className="mx-2 mt-1 mb-2 flex w-[calc(100%-1rem)] items-center justify-between gap-3 rounded-lg border border-accent-line bg-accent-soft px-3 py-2 text-left text-xs text-accent-fg"
              >
                <span className="truncate">
                  Triggered <span className="font-semibold">{last.label}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 font-medium">
                  Open {last.view.label} <ArrowUpRight className="size-3.5" />
                </span>
              </button>
            )}
            {GROUPS.map((g) => (
              <div key={g.title} className="pb-1">
                <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium text-fg-4">{g.title}</div>
                {g.items.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      run(s.key)
                      setLast(s)
                    }}
                    className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-3"
                  >
                    <s.icon className={cn('size-4 shrink-0', TONE_TEXT[s.tone])} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-fg">{s.label}</span>
                      <span className="block truncate text-xs text-fg-3">{s.hint}</span>
                    </span>
                    <span className="text-xs font-medium text-fg-4 opacity-0 transition-opacity group-hover:opacity-100">Run</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 border-t border-border bg-surface-2 px-4 py-3">
            <label className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-medium text-fg-3">ISP partner</span>
              <Select value={partnerId} onChange={(e) => setPartner(e.target.value as PartnerId)} className="h-8 text-[13px]">
                {PARTNERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={running ? Pause : Play} onClick={() => setRunning(!running)} className="flex-1">
                {running ? 'Pause live data' : 'Resume live data'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={RotateCcw}
                onClick={() => {
                  reset()
                  setLast(null)
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
