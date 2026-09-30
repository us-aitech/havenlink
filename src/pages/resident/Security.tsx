import { useState } from 'react'
import { AppWindow, BatteryMedium, DoorClosed, DoorOpen, Headset, Lock, LockOpen, Moon, PersonStanding, Plane, ShieldAlert, ShieldCheck, ShieldOff, Siren, Video, Warehouse } from 'lucide-react'
import { EventFeed } from '@/components/EventFeed'
import { CameraTile } from '@/components/home/CameraTile'
import { PinPad } from '@/components/PinPad'
import { Badge, Button, Card, CardHeader, Modal, PageHeader, Toggle, type Tone } from '@/components/ui'
import { DEMO } from '@/config'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { useStore } from '@/store/useStore'

export default function Security() {
  const home = useStore((s) => s.home)
  const events = useStore((s) => s.events)
  const arm = useStore((s) => s.armSecurity)
  const setLock = useStore((s) => s.setLock)
  const lockAll = useStore((s) => s.lockAll)
  const setGarage = useStore((s) => s.setGarage)
  const setWindowOpen = useStore((s) => s.setWindowOpen)
  const setDoorOpen = useStore((s) => s.setDoorOpen)
  const setRecording = useStore((s) => s.setCameraRecording)
  const [pinOpen, setPinOpen] = useState(false)
  const now = useNow(250)

  const { security } = home
  const alarm = security.status === 'alarm'
  const entry = security.status === 'entry-delay'
  const arming = security.status === 'arming'
  const remaining = security.deadline ? Math.max(0, Math.ceil((security.deadline - now) / 1000)) : 0
  const tone: Tone = alarm ? 'critical' : entry ? 'warning' : security.mode === 'disarmed' ? 'neutral' : 'good'
  const secEvents = events.filter((e) => e.scope !== 'ops' && (e.category === 'security' || e.category === 'access'))

  const modes = [
    { key: 'disarmed' as const, label: 'Disarmed', icon: ShieldOff, hint: 'Sensors monitored, no alarm' },
    { key: 'home' as const, label: 'Armed Home', icon: Moon, hint: 'Doors & windows armed, motion off' },
    { key: 'away' as const, label: 'Armed Away', icon: Plane, hint: `All zones · ${DEMO.exitDelaySeconds}s exit delay` },
  ]

  return (
    <>
      <PageHeader eyebrow="Security" title="Alarm, locks & cameras" subtitle="Professionally monitored 24/7 · cellular backup keeps the system online during outages" />

      <Card className={cn('mb-4', alarm && 'animate-siren border-critical-line', entry && 'border-warning-line bg-warning-soft')} padded={false}>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'relative flex size-16 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                  alarm ? 'bg-critical-soft text-critical-fg ring-critical-line' : entry ? 'bg-warning-soft text-warning-fg ring-warning-line' : security.mode === 'disarmed' ? 'bg-surface-2 text-fg-2 ring-border' : 'bg-good-soft text-good-fg ring-good-line',
                )}
              >
                {alarm ? <Siren className="size-8" /> : security.mode === 'disarmed' ? <ShieldOff className="size-8" /> : <ShieldCheck className="size-8" />}
                {(alarm || entry) && <span className="absolute inset-0 animate-pulse-ring rounded-xl ring-2 ring-critical-line" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-fg">
                    {alarm ? 'ALARM — Intrusion detected' : entry ? `Entry delay · ${remaining}s` : arming ? `Arming Away · ${remaining}s` : security.mode === 'disarmed' ? 'System disarmed' : security.mode === 'away' ? 'Armed · Away' : 'Armed · Home'}
                  </h2>
                  <Badge tone={tone} dot>
                    {alarm ? 'Siren on' : entry ? 'Disarm now' : security.mode === 'disarmed' ? 'Ready to arm' : 'Protected'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-fg-3">
                  {alarm
                    ? `${security.triggeredBy} opened while armed. Siren is sounding, all cameras recording, monitoring center notified.`
                    : entry
                      ? `${security.triggeredBy} opened. Enter your PIN before the countdown ends or the alarm will sound.`
                      : arming
                        ? 'Leave now — doors locked, lights off, garage closing.'
                        : `Last change ${timeAgo(security.lastChangedAt, now)}`}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {modes.map((m) => {
                const active = security.mode === m.key
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      if (m.key === 'disarmed') {
                        if (security.mode !== 'disarmed') setPinOpen(true)
                      } else if (security.mode === 'disarmed') arm(m.key)
                      else setPinOpen(true)
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 text-left transition',
                      active ? (m.key === 'disarmed' ? 'border-neutral-line bg-surface-2' : 'border-good-line bg-good-soft') : 'border-border bg-surface-2 hover:bg-surface-3',
                    )}
                  >
                    <m.icon className={cn('size-5', active ? (m.key === 'disarmed' ? 'text-fg' : 'text-good-fg') : 'text-fg-3')} />
                    <span>
                      <span className="block text-sm font-medium text-fg">{m.label}</span>
                      <span className="block text-[11px] text-fg-3">{m.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {(alarm || entry) && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
                <Headset className="size-5 shrink-0 text-accent-fg" />
                <span className="text-fg-2">
                  {alarm ? 'Central station operator is calling your phone to verify. If unreachable, police will be dispatched.' : 'Central station will be notified if the alarm is not disarmed.'}
                </span>
              </div>
            )}
          </div>
          {(alarm || entry) && (
            <div className="flex justify-center rounded-xl border border-border bg-surface-2 p-4">
              <PinPad compact />
            </div>
          )}
        </div>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Doors & locks"
            icon={Lock}
            action={
              <Button size="xs" variant="secondary" icon={Lock} onClick={lockAll}>
                Lock all
              </Button>
            }
          />
          <div className="flex flex-col divide-y divide-border">
            {home.doors.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2.5">
                <div className={cn('flex size-9 items-center justify-center rounded-lg', d.kind === 'garage' ? (d.open ? 'bg-warning-soft text-warning-fg' : 'bg-surface-2 text-fg-3') : d.locked ? 'bg-good-soft text-good-fg' : 'bg-warning-soft text-warning-fg')}>
                  {d.kind === 'garage' ? <Warehouse className="size-4" /> : d.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">{d.name}</div>
                  <div className="flex items-center gap-2 text-xs text-fg-3">
                    {d.kind === 'garage' ? (d.moving ? `${d.moving === 'opening' ? 'Opening' : 'Closing'}…` : d.open ? 'Open' : 'Closed') : `${d.locked ? 'Locked' : 'Unlocked'} · ${d.open ? 'door open' : 'door closed'}`}
                    {d.kind === 'lock' && (
                      <span className="inline-flex items-center gap-0.5">
                        <BatteryMedium className="size-3" />
                        {d.battery}%
                      </span>
                    )}
                  </div>
                </div>
                {d.kind === 'garage' ? (
                  <Button size="xs" variant="secondary" disabled={!!d.moving} onClick={() => setGarage(d.id, !d.open)}>
                    {d.open ? 'Close' : 'Open'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    {d.open ? (
                      <button onClick={() => setDoorOpen(d.id, false)} className="text-[11px] text-fg-3 hover:text-fg-2">
                        Close
                      </button>
                    ) : null}
                    <Toggle checked={d.locked} onChange={(v) => setLock(d.id, v)} tone="good" label={`${d.name} lock`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Sensors" subtitle="Tap a window to simulate it opening" icon={AppWindow} />
          <div className="flex flex-col divide-y divide-border">
            {home.windows.map((w) => (
              <div key={w.id} className="flex items-center gap-3 py-2.5">
                <div className={cn('flex size-9 items-center justify-center rounded-lg', w.open ? 'bg-warning-soft text-warning-fg' : 'bg-surface-2 text-fg-3')}>
                  {w.open ? <DoorOpen className="size-4" /> : <DoorClosed className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">{w.name}</div>
                  <div className="text-xs text-fg-3">Contact sensor · {w.battery}% battery</div>
                </div>
                <button onClick={() => setWindowOpen(w.id, !w.open)}>
                  <Badge tone={w.open ? 'warning' : 'good'}>{w.open ? 'Open' : 'Closed'}</Badge>
                </button>
              </div>
            ))}
            {home.motion.map((m) => {
              const recent = m.lastMotionAt !== null && now - m.lastMotionAt < 30_000
              return (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className={cn('flex size-9 items-center justify-center rounded-lg', recent ? 'bg-info-soft text-info-fg' : 'bg-surface-2 text-fg-3')}>
                    <PersonStanding className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg">{m.name}</div>
                    <div className="text-xs text-fg-3">Last motion {timeAgo(m.lastMotionAt, now)}</div>
                  </div>
                  <Badge tone={recent ? 'info' : 'neutral'}>{recent ? 'Motion' : 'Clear'}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader title="Cameras" subtitle="Live view · 30-day cloud recording" icon={Video} />
        <div className="grid gap-3 sm:grid-cols-2">
          {home.cameras.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <CameraTile camera={c} alarm={alarm} />
              <div className="flex items-center justify-between px-1 text-xs text-fg-3">
                <span>Continuous recording</span>
                <Toggle size="sm" checked={c.recording} onChange={(v) => setRecording(c.id, v)} label={`${c.name} recording`} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Security log" icon={ShieldAlert} />
        <EventFeed events={secEvents} limit={10} />
      </Card>

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title="Enter PIN to disarm" subtitle="Your 4-digit security code" size="sm" icon={ShieldCheck}>
        <div className="py-2">
          <PinPad onSuccess={() => setPinOpen(false)} />
        </div>
      </Modal>
    </>
  )
}
