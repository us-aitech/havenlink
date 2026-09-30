import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Camera, Check, CircleCheck, Droplets, ImagePlus, Lock, RadioTower, TriangleAlert, Unplug, Upload, type LucideIcon } from 'lucide-react'
import { Avatar, Badge, Button, Drawer, Input, KeyValue, Modal, ProgressBar, SectionTitle, Select, TONE_TEXT, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, dbm, formatDateTime, formatDuration, formatTime, formatWeekday, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { SLA_HOURS, SLA_TONE, TECH_STATUS_LABEL, WORKFLOWS, isOpen, nextStage, slaState, stageIndex, stageLabel } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { WaterStatus, WorkOrder, WorkOrderPhoto } from '@/types'
import { OntCell, OntStatusBadge, RxGauge } from './NetParts'
import { AssigneeChip, PriorityBadge, SLA_BADGE_TONE, SlaIcon, TypeBadge } from './WoParts'
import { SLA_LABEL, WO_SOURCE_ICON, lastEntryFor, locationLabel, makeSamplePhoto, samplePhotoCaption } from './WoUtils'

const CALLOUT_CLASS: Record<Tone, string> = {
  neutral: 'border-border bg-surface-2',
  info: 'border-info-line bg-info-soft',
  accent: 'border-accent-line bg-accent-soft',
  good: 'border-good-line bg-good-soft',
  warning: 'border-warning-line bg-warning-soft',
  serious: 'border-serious-line bg-serious-soft',
  critical: 'border-critical-line bg-critical-soft',
}

const WATER_TONE: Record<WaterStatus, Tone> = { normal: 'good', warning: 'warning', leak: 'critical' }
const WATER_LABEL: Record<WaterStatus, string> = { normal: 'Normal', warning: 'Unusual flow', leak: 'Leak detected' }

function clock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h >= 48) return formatDuration(ms)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function inSentence(label: string): string {
  return /^[A-Z][a-z]+(\s|$)/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function SlaPanel({ wo, now }: { wo: WorkOrder; now: number }) {
  const state = slaState(wo, now)
  const tone = SLA_TONE[state]
  const alarming = state === 'at-risk' || state === 'breached' || state === 'missed'
  const scheduledWindow = wo.scheduledFor !== undefined && (wo.type === 'install' || wo.type === 'maintenance')
  const target = scheduledWindow ? 'Scheduled window + 4h' : `${SLA_HOURS[wo.type][wo.priority]}h ${wo.priority} target`
  const shell = cn('rounded-lg border p-4', alarming ? CALLOUT_CLASS[tone] : 'border-border')

  if (wo.closedAt) {
    return (
      <div className={cn(shell, 'flex items-start gap-3')}>
        <SlaIcon state={state} className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[tone])} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-fg">
            Closed {formatDateTime(wo.closedAt)} · {SLA_LABEL[state]}
          </div>
          <div className="mt-0.5 text-xs text-fg-3">
            Resolved in {formatDuration(wo.closedAt - wo.createdAt)} · {target} · due {formatDateTime(wo.dueAt)}
          </div>
        </div>
      </div>
    )
  }

  const remaining = wo.dueAt - now
  const total = Math.max(1, wo.dueAt - wo.createdAt)
  const elapsed = (now - wo.createdAt) / total
  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-fg-3">{remaining < 0 ? 'Past due by' : 'Time remaining'}</div>
          <div className={cn('mt-0.5 font-mono text-2xl leading-8 font-semibold tracking-[-0.02em] tabular', alarming ? TONE_TEXT[tone] : 'text-fg')}>{clock(remaining)}</div>
          <div className="text-xs text-fg-3">Due {formatDateTime(wo.dueAt)}</div>
        </div>
        <Badge tone={SLA_BADGE_TONE[state]} className="shrink-0">
          <SlaIcon state={state} className="size-3" />
          {SLA_LABEL[state]}
        </Badge>
      </div>
      <ProgressBar value={elapsed} tone={alarming ? tone : 'accent'} className="mt-4" />
      <div className="mt-2 flex justify-between gap-3 text-xs text-fg-3">
        <span>Opened {timeAgo(wo.createdAt, now)}</span>
        <span className="text-right">{target}</span>
      </div>
    </div>
  )
}

function Callout({ tone, icon: Icon, title, children }: { tone: Tone; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg border p-4', CALLOUT_CLASS[tone])}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[tone])} />
        <div className="min-w-0 flex-1">
          <div className={cn('text-[13px] font-semibold', TONE_TEXT[tone])}>{title}</div>
          <div className="mt-1 text-[13px] text-fg-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

function IncidentCallout({ wo }: { wo: WorkOrder }) {
  const onts = useStore((s) => s.ops.onts)
  const splitters = useStore((s) => s.ops.splitters)
  const water = useStore((s) => s.home.water)
  const homeNetwork = useStore((s) => s.home.network)

  if (wo.incident === 'fiber-cut') {
    const splitter = splitters.find((s) => s.id === wo.splitterId)
    const childIds = new Set(splitters.filter((s) => s.parentId === wo.splitterId).map((s) => s.id))
    const affected = onts.filter((o) => o.splitterId === wo.splitterId || childIds.has(o.splitterId))
    const down = affected.filter((o) => o.status === 'los').length
    const restored = down === 0
    return (
      <Callout
        tone={restored ? 'good' : 'critical'}
        icon={restored ? CircleCheck : Unplug}
        title={restored ? `Service restored · ${affected.length} homes back online` : `${down} of ${affected.length} homes without fiber service`}
      >
        <p>
          {splitter ? `${splitter.name} (${splitter.ratio}) · ${splitter.cabinet}. ` : ''}
          {restored ? 'All ONTs on this splitter have light again and residents are back on fiber.' : 'Closing this work order restores service to affected homes. LTE backup deactivates on the resident side.'}
        </p>
        {affected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {affected.map((o) => (
              <OntCell key={o.id} ont={o} status={o.status} rx={o.rxPowerDbm} size="sm" />
            ))}
          </div>
        )}
        {!restored && homeNetwork.backupActive && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-fg-2">
            <RadioTower className="mt-px size-3.5 shrink-0 text-warning-fg" />
            Demo home hub is on LTE backup. Alarm, cameras and leak protection stay online.
          </p>
        )}
      </Callout>
    )
  }

  if (wo.incident === 'signal-degradation') {
    const ont = onts.find((o) => o.id === wo.ontId)
    const rx = ont?.isDemoHome ? homeNetwork.rxPowerDbm : (ont?.rxPowerDbm ?? null)
    const status = ont?.isDemoHome ? homeNetwork.status : ont?.status
    const ok = status === 'online'
    return (
      <Callout tone={ok ? 'good' : 'warning'} icon={ok ? CircleCheck : TriangleAlert} title={ok ? `Light level normal · ${dbm(rx)}` : `Low light on ONT · ${dbm(rx)}`}>
        <p className="mb-4">{ok ? 'Receive power is back above the −27 dBm threshold.' : 'Receive power is below the −27 dBm GPON threshold. Clean, inspect and re-terminate the connector, then re-test.'}</p>
        <RxGauge value={rx} />
      </Callout>
    )
  }

  if (wo.incident === 'leak-followup') {
    const tone = WATER_TONE[water.status]
    const stats = [
      { label: 'Valve', value: water.valve.charAt(0).toUpperCase() + water.valve.slice(1) },
      { label: 'Flow', value: `${water.flowGpm.toFixed(2)} GPM` },
      { label: 'Pressure', value: `${water.pressurePsi.toFixed(0)} psi` },
    ]
    return (
      <Callout tone={tone} icon={Droplets} title={`Live water status · ${WATER_LABEL[water.status]}`}>
        <dl className="mt-2 grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-fg-3">{s.label}</dt>
              <dd className="text-[13px] font-semibold text-fg tabular">{s.value}</dd>
            </div>
          ))}
        </dl>
        {water.leakCause && <p className="mt-3 text-xs text-fg-3">{water.leakCause}</p>}
        {water.leakDetectedAt && <p className="mt-1 text-xs text-fg-3">Detected at {formatTime(water.leakDetectedAt)}</p>}
      </Callout>
    )
  }

  return null
}

function WorkflowStepper({ wo, now }: { wo: WorkOrder; now: number }) {
  const stages = WORKFLOWS[wo.type]
  const current = stageIndex(wo)
  const closed = !isOpen(wo)
  return (
    <ol className="flex flex-col">
      {stages.map((stage, i) => {
        const entry = lastEntryFor(wo, stage.key)
        const done = i < current || (closed && i === current)
        const active = i === current && !closed
        const last = i === stages.length - 1
        return (
          <li key={stage.key} className={cn('relative flex gap-3', !last && 'pb-5')}>
            {!last && <span aria-hidden className={cn('absolute top-6 bottom-0 left-[11px] w-px', i < current ? 'bg-good' : 'bg-border')} />}
            <span
              className={cn(
                'relative flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular',
                done && 'bg-good text-on-accent',
                active && 'bg-surface text-accent-fg ring-2 ring-accent',
                !done && !active && 'bg-surface text-fg-4 ring-1 ring-border-strong',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-[13px] leading-5', done ? 'text-fg' : active ? 'font-semibold text-fg' : 'text-fg-3')}>{stage.label}</span>
                {active && <Badge tone="accent">In progress</Badge>}
              </div>
              {entry && (done || active) && (
                <div className="mt-0.5 text-xs text-fg-3">
                  {formatDateTime(entry.at)} · {entry.by}
                  {active && ` · ${timeAgo(entry.at, now)}`}
                </div>
              )}
              {!entry && done && <div className="mt-0.5 text-xs text-fg-3">Completed</div>}
              {entry?.note && <div className="mt-1.5 border-l-2 border-border pl-2.5 text-xs text-fg-2">{entry.note}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function PhotoSection({ wo, location }: { wo: WorkOrder; location: string }) {
  const addPhoto = useStore((s) => s.addWorkOrderPhoto)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<WorkOrderPhoto | null>(null)
  const needsPhoto = wo.stage === 'documenting' && wo.photos.length === 0

  const addSample = () => {
    const caption = samplePhotoCaption(wo)
    addPhoto(wo.id, makeSamplePhoto(wo, caption, location, Date.now()), caption)
  }

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      addPhoto(wo.id, URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, '') || 'Field photo')
    }
    e.target.value = ''
  }

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex gap-1.5">
            <Button size="xs" variant="secondary" icon={ImagePlus} onClick={addSample}>
              Add sample
            </Button>
            <Button size="xs" variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>
              Upload
            </Button>
          </div>
        }
      >
        Photos <span className="ml-1 font-normal text-fg-3 tabular">{wo.photos.length}</span>
      </SectionTitle>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      {needsPhoto && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-xs text-warning-fg">
          <TriangleAlert className="size-3.5 shrink-0" />
          Add at least one photo before closing this work order.
        </div>
      )}
      {wo.photos.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {wo.photos.map((p) => (
            <button key={p.id} type="button" onClick={() => setPreview(p)} className="group min-w-0 text-left">
              <span className="block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-3 transition-colors group-hover:border-border-strong">
                <img src={p.url} alt={p.caption} className="size-full object-cover" />
              </span>
              <span className="mt-1.5 block truncate text-xs font-medium text-fg">{p.caption}</span>
              <span className="block text-xs text-fg-3">{formatTime(p.at)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border-strong px-4 py-6 text-center">
          <Camera className="mb-1 size-4 text-fg-3" />
          <div className="text-[13px] font-medium text-fg">No photos yet</div>
          <div className="max-w-xs text-xs text-fg-3">Splice trays, light-meter readings, cabinets and finished installs are documented here for the ISP.</div>
        </div>
      )}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.caption ?? ''} subtitle={preview ? `${wo.number} · ${formatDateTime(preview.at)}` : undefined} size="lg">
        {preview && <img src={preview.url} alt={preview.caption} className="w-full rounded-lg border border-border" />}
      </Modal>
    </section>
  )
}

function NotesSection({ wo }: { wo: WorkOrder }) {
  const addNote = useStore((s) => s.addWorkOrderNote)
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    addNote(wo.id, value, 'Dispatcher')
    setText('')
  }
  return (
    <section>
      <SectionTitle>
        Notes <span className="ml-1 font-normal text-fg-3 tabular">{wo.notes.length}</span>
      </SectionTitle>
      {wo.notes.length > 0 && (
        <ul className="mb-4 flex flex-col gap-4">
          {wo.notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              <Avatar initials={initialsOf(n.by)} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-fg">{n.by}</span>
                  <span className="text-xs text-fg-3">{formatDateTime(n.at)}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-5 break-words text-fg-2">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a dispatcher note" aria-label="Note" />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          Add note
        </Button>
      </form>
    </section>
  )
}

export function WorkOrderDrawer({ workOrderId, onClose }: { workOrderId: string | null; onClose: () => void }) {
  const now = useNow()
  const wo = useStore((s) => (workOrderId ? s.ops.workOrders.find((w) => w.id === workOrderId) : undefined))
  const technicians = useStore((s) => s.ops.technicians)
  const properties = useStore((s) => s.ops.properties)
  const onts = useStore((s) => s.ops.onts)
  const splitters = useStore((s) => s.ops.splitters)
  const assets = useStore((s) => s.ops.assets)
  const advance = useStore((s) => s.advanceWorkOrder)
  const assign = useStore((s) => s.assignWorkOrder)

  if (!wo) return null

  const property = properties.find((p) => p.id === wo.propertyId)
  const ont = onts.find((o) => o.id === wo.ontId)
  const splitter = splitters.find((s) => s.id === (wo.splitterId ?? ont?.splitterId))
  const asset = assets.find((a) => a.id === wo.assetId)
  const tech = technicians.find((t) => t.id === wo.assigneeId)
  const next = nextStage(wo)
  const open = isOpen(wo)
  const SourceIcon = WO_SOURCE_ICON[wo.source]
  const location = locationLabel(property?.name, wo.unit)

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={
        <>
          <span className="block font-mono text-xs font-normal text-fg-3">{wo.number}</span>
          <span className="block">{wo.title}</span>
        </>
      }
      subtitle={location}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={wo.assigneeId ?? ''} onChange={(e) => e.target.value && assign(wo.id, e.target.value)} disabled={!open} aria-label="Assign technician" className="sm:max-w-64">
            <option value="" disabled>
              Assign technician
            </option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {TECH_STATUS_LABEL[t.status]}
              </option>
            ))}
          </Select>
          <Button variant="primary" disabled={!next} icon={next ? undefined : Lock} iconRight={next ? ArrowRight : undefined} onClick={() => advance(wo.id)} className="sm:ml-auto">
            {next ? `Advance to ${inSentence(next.label)}` : 'Work order closed'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={wo.priority} />
            <TypeBadge type={wo.type} />
            <Badge tone="neutral" icon={SourceIcon}>
              {wo.source}
            </Badge>
            <Badge tone={open ? 'accent' : 'good'} dot>
              {stageLabel(wo)}
            </Badge>
          </div>
          <SlaPanel wo={wo} now={now} />
          {wo.incident && <IncidentCallout wo={wo} />}
          {wo.description && <p className="text-sm leading-6 text-fg-2">{wo.description}</p>}
        </div>

        <section>
          <SectionTitle>Details</SectionTitle>
          <div className="divide-y divide-border border-y border-border">
            <KeyValue label="Property" value={property ? `${property.name} · ${property.city}` : wo.propertyId} />
            <KeyValue label="Unit" value={wo.unit ?? '—'} />
            {ont && (
              <KeyValue
                label="ONT"
                value={
                  <Link to={`/ops/network?property=${ont.propertyId}&ont=${ont.id}`} className="inline-flex flex-wrap items-center justify-end gap-2 hover:text-accent-fg">
                    <span className="font-mono text-xs font-normal underline decoration-border-strong underline-offset-2">{ont.serial}</span>
                    <OntStatusBadge status={ont.status} />
                  </Link>
                }
              />
            )}
            {splitter && <KeyValue label="Splitter" value={`${splitter.name} · ${splitter.ratio} · ${splitter.cabinet}`} />}
            {asset && <KeyValue label="Asset" value={`${asset.name} · ${asset.kind} · ${asset.condition}`} />}
            {wo.scheduledFor && <KeyValue label="Scheduled for" value={`${formatWeekday(wo.scheduledFor)} · ${formatTime(wo.scheduledFor)}`} />}
            {wo.package && <KeyValue label="Package" value={`HavenLink ${wo.package}`} />}
            <KeyValue label="Created" value={`${formatDateTime(wo.createdAt)} · ${timeAgo(wo.createdAt, now)}`} />
            <KeyValue label="Assignee" value={<AssigneeChip tech={tech} className="font-medium text-fg" />} />
            <KeyValue label="Billable" value={wo.billable ? currency(wo.billable) : 'Included in retainer'} />
          </div>
        </section>

        <section>
          <SectionTitle action={<span className="text-xs text-fg-3 tabular">{`Step ${Math.max(0, stageIndex(wo)) + 1} of ${WORKFLOWS[wo.type].length}`}</span>}>Workflow</SectionTitle>
          <WorkflowStepper wo={wo} now={now} />
        </section>

        <PhotoSection wo={wo} location={location} />

        <NotesSection wo={wo} />

        {!open && <p className="text-xs text-fg-3">Closed work orders stay available for ISP audits and billing.</p>}
      </div>
    </Drawer>
  )
}
