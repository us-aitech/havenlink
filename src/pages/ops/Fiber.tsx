import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Cable, Check, CircleCheck, House, Minus, PhoneCall, Split, TicketPlus, X, type LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Stat, StatusDot, type Tone } from '@/components/ui'
import { AssigneeChip, PriorityBadge } from '@/components/ops/WoParts'
import { DEMO_PROPERTY_ID } from '@/data/seed'
import { cn } from '@/lib/cn'
import {
  FAULT_DISPATCH,
  FAULT_LEVEL_LABEL,
  FIBER_SIGNAL_LABEL,
  fiberSignal,
  locateFiberFaults,
  workOrderForFault,
  type FaultLevel,
  type FiberFault,
  type FiberSignal,
} from '@/lib/fiber'
import { num, pct } from '@/lib/format'
import { usePartner } from '@/lib/hooks'
import { bestTechnicianFor } from '@/sim/engine'
import { useStore } from '@/store/useStore'
import type { Ont, Splitter } from '@/types'

const SIGNAL_CELL: Record<FiberSignal, string> = {
  signal: 'bg-good',
  'no-signal': 'bg-critical',
  'no-response': 'bg-neutral',
}

// Shape as well as color, so the state survives color blindness.
const SIGNAL_GLYPH: Record<FiberSignal, LucideIcon> = {
  signal: Check,
  'no-signal': X,
  'no-response': Minus,
}

const LEVEL_TONE: Record<FaultLevel, Tone> = {
  feeder: 'critical',
  splitter: 'critical',
  drop: 'warning',
  'no-response': 'neutral',
}

const LEVEL_ICON: Record<FaultLevel, LucideIcon> = {
  feeder: Cable,
  splitter: Split,
  drop: House,
  'no-response': PhoneCall,
}

const RULES: Array<{ level: FaultLevel; when: string; then: string }> = [
  { level: 'drop', when: 'One home dark, neighbors on the same splitter still lit', then: 'Drop cable or in-home fiber. P2 trouble call.' },
  { level: 'splitter', when: 'Every home on one 1:8 splitter dark, other splitters in the cabinet lit', then: 'The splitter or the fiber feeding it. P1 emergency.' },
  { level: 'feeder', when: 'Every splitter under one 1:4 feeder dark at once', then: 'Street run upstream of the cabinet. P1 emergency.' },
  { level: 'no-response', when: 'ONT stopped answering with no loss-of-signal alarm', then: 'Fiber state unknown, most likely power. Call the resident before a truck roll.' },
]

function unitsLabel(n: number) {
  return `${n} home${n === 1 ? '' : 's'}`
}

function faultTitle(f: FiberFault): string {
  const n = f.onts.length
  if (f.level === 'feeder') return `${f.splitter.cabinet} feeder · ${unitsLabel(n)} dark`
  if (f.level === 'splitter') return `${f.splitter.name} at ${f.splitter.cabinet} · ${unitsLabel(n)} dark`
  return f.onts[0]?.unit ?? '—'
}

function faultEvidence(f: FiberFault, splitters: Splitter[]): string {
  if (f.level === 'feeder') {
    const count = splitters.filter((s) => s.parentId === f.splitter.id).length
    return `All ${count} splitters under ${f.splitter.name} lost light at the same time.`
  }
  if (f.level === 'splitter') {
    return f.ambiguous
      ? `Every home on ${f.splitter.name} is dark. It is the only splitter on its feeder, so the feeder can't be ruled out.`
      : `Every home on ${f.splitter.name} is dark while ${unitsLabel(f.litNeighbors)} on the other splitters in ${f.splitter.cabinet} still have light.`
  }
  if (f.level === 'drop') {
    const base = f.ambiguous
      ? `No lit neighbor on ${f.splitter.name}, so the splitter port can't be ruled out.`
      : `${unitsLabel(f.litNeighbors)} on ${f.splitter.name} still have light, so the network is fine up to the splitter port.`
    return f.darkSiblings > 0 ? `${base} ${unitsLabel(f.darkSiblings)} on the same splitter also dark.` : base
  }
  return 'The ONT stopped answering the OLT without a loss-of-signal alarm. Its fiber state is unknown; the usual cause is power at the home.'
}

function faultNextStep(f: FiberFault): string {
  if (f.level === 'feeder') return `Send a splicing crew to the street run feeding ${f.splitter.cabinet}. OTDR from the cabinet toward the OLT.`
  if (f.level === 'splitter') return `Inspect ${f.splitter.cabinet}: test light at the splitter input, then the splitter itself.`
  if (f.level === 'drop') return `Measure light at the ${f.splitter.cabinet} port. Light there → drop cable or inside the home (wall outlet, patch cord, ONT). No light → splitter port.`
  return 'Ask the resident to check the ONT power cord and outlet. Send a truck only if the ONT is powered and its LOS light is on.'
}

function SignalCell({ ont, onSelect }: { ont: Ont; onSelect: (o: Ont) => void }) {
  const signal = fiberSignal(ont.status)
  const label = `${ont.unit} · ${FIBER_SIGNAL_LABEL[signal]}${ont.isDemoHome ? ' · Demo home' : ''}`
  const Glyph = SIGNAL_GLYPH[signal]
  return (
    <button
      type="button"
      onClick={() => onSelect(ont)}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] transition-transform hover:scale-110',
        SIGNAL_CELL[signal],
        ont.isDemoHome && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
      )}
    >
      <Glyph aria-hidden className="size-3 text-surface" strokeWidth={3} />
    </button>
  )
}

function SignalLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-3', className)}>
      {(['signal', 'no-signal', 'no-response'] as FiberSignal[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          {(() => {
            const Glyph = SIGNAL_GLYPH[s]
            return (
              <span className={cn('inline-flex size-3.5 items-center justify-center rounded-[3px]', SIGNAL_CELL[s])}>
                <Glyph aria-hidden className="size-2.5 text-surface" strokeWidth={3} />
              </span>
            )
          })()}
          {FIBER_SIGNAL_LABEL[s]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-surface-3 ring-2 ring-accent ring-offset-1 ring-offset-surface" />
        Demo home
      </span>
    </div>
  )
}

function FaultRow({ fault }: { fault: FiberFault }) {
  const navigate = useNavigate()
  const splitters = useStore((s) => s.ops.splitters)
  const properties = useStore((s) => s.ops.properties)
  const workOrders = useStore((s) => s.ops.workOrders)
  const technicians = useStore((s) => s.ops.technicians)
  const createWorkOrder = useStore((s) => s.createWorkOrder)
  const wo = workOrderForFault(fault, workOrders, splitters)
  const tech = technicians.find((t) => t.id === wo?.assigneeId)
  const property = properties.find((p) => p.id === fault.propertyId)
  const ont = fault.onts[0]
  const Icon = LEVEL_ICON[fault.level]
  const tone = LEVEL_TONE[fault.level]
  const shared = fault.level === 'feeder' || fault.level === 'splitter'

  const dispatch = () => {
    const plan = FAULT_DISPATCH[fault.level]
    const best = plan.type === 'support' ? null : bestTechnicianFor(useStore.getState(), plan.type)
    const title =
      fault.level === 'feeder'
        ? `Feeder cut — ${fault.splitter.name} · ${unitsLabel(fault.onts.length)} down`
        : fault.level === 'splitter'
          ? `Splitter outage — ${fault.splitter.name} · ${unitsLabel(fault.onts.length)} down`
          : fault.level === 'drop'
            ? `No fiber signal — ${ont?.unit}`
            : `ONT not responding — ${ont?.unit}`
    createWorkOrder({
      type: plan.type,
      priority: plan.priority,
      title,
      description: `${faultEvidence(fault, splitters)} ${faultNextStep(fault)}`,
      propertyId: fault.propertyId,
      unit: shared ? undefined : ont?.unit,
      ontId: shared ? undefined : ont?.id,
      splitterId: shared ? fault.splitter.id : undefined,
      source: 'Auto-detect',
      incident: plan.incident,
      assigneeId: best?.id ?? null,
    })
  }

  const dispatchLabel = fault.level === 'no-response' ? 'Contact resident' : shared ? 'Dispatch crew' : 'Open trouble call'

  return (
    <li className={cn('flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start', shared && 'bg-critical-soft')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone} icon={Icon}>
            {FAULT_LEVEL_LABEL[fault.level]}
          </Badge>
          {fault.ambiguous && <Badge tone="neutral">Low confidence</Badge>}
          {ont?.isDemoHome && !shared && <Badge tone="accent">Demo home</Badge>}
        </div>
        <div className="mt-2 text-[13px] font-semibold text-fg">{faultTitle(fault)}</div>
        <div className="text-xs text-fg-3">
          {property?.name ?? fault.propertyId}
          {!shared && ` · ${fault.splitter.name} · ${fault.splitter.cabinet}`}
        </div>
        <p className="mt-2 max-w-3xl text-[13px] text-fg-2">{faultEvidence(fault, splitters)}</p>
        <p className="mt-1 max-w-3xl text-[13px] text-fg">
          <span className="font-medium">Next step: </span>
          {faultNextStep(fault)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
        {wo ? (
          <>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={wo.priority} />
              <span className="font-mono text-xs text-fg-2">{wo.number}</span>
            </div>
            <AssigneeChip tech={tech} />
            <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={() => navigate(`/ops/work-orders?id=${wo.id}`)}>
              Open {wo.number}
            </Button>
          </>
        ) : (
          <Button variant={shared ? 'danger' : 'secondary'} size="sm" icon={fault.level === 'no-response' ? PhoneCall : TicketPlus} onClick={dispatch}>
            {dispatchLabel}
          </Button>
        )}
      </div>
    </li>
  )
}

function SignalMap({ propertyId, faults }: { propertyId: string; faults: FiberFault[] }) {
  const navigate = useNavigate()
  const splitters = useStore((s) => s.ops.splitters)
  const onts = useStore((s) => s.ops.onts)
  const dark = useMemo(() => new Map(faults.filter((f) => f.level === 'feeder' || f.level === 'splitter').map((f) => [f.splitter.id, f.level])), [faults])

  const tree = useMemo(() => {
    const local = splitters.filter((s) => s.propertyId === propertyId)
    return local
      .filter((s) => !s.parentId)
      .map((primary) => ({
        primary,
        children: local.filter((s) => s.parentId === primary.id).map((s) => ({ splitter: s, onts: onts.filter((o) => o.splitterId === s.id) })),
      }))
  }, [splitters, onts, propertyId])

  const open = (o: Ont) => navigate(`/ops/network?property=${o.propertyId}&ont=${o.id}`)

  return (
    <div className="flex flex-col gap-5">
      {tree.map(({ primary, children }) => {
        const feederDark = dark.get(primary.id) === 'feeder'
        return (
          <div key={primary.id}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={cn('font-mono text-[13px] font-semibold', feederDark ? 'text-critical-fg' : 'text-fg')}>{primary.name}</span>
              <span className="text-xs text-fg-3">
                {primary.ratio} feeder · {primary.cabinet}
              </span>
              {feederDark && (
                <Badge tone="critical" icon={Cable}>
                  Feeder dark
                </Badge>
              )}
            </div>
            <ul className="mt-2 flex flex-col gap-1.5 border-l border-border-strong pl-4">
              {children.map(({ splitter, onts: list }) => {
                const lit = list.filter((o) => fiberSignal(o.status) === 'signal').length
                const splitterDark = feederDark || dark.has(splitter.id)
                return (
                  <li key={splitter.id} className={cn('-mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-2 py-1.5', splitterDark && 'bg-critical-soft')}>
                    <div className="flex w-full items-center gap-2 sm:w-44 sm:shrink-0">
                      <span className={cn('font-mono text-xs font-medium', splitterDark ? 'text-critical-fg' : 'text-fg')}>{splitter.name}</span>
                      <span className="truncate text-xs text-fg-3">{splitter.cabinet}</span>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {list.map((o) => (
                        <SignalCell key={o.id} ont={o} onSelect={open} />
                      ))}
                    </div>
                    <span className={cn('ml-auto text-xs whitespace-nowrap tabular', lit === list.length ? 'text-fg-3' : lit === 0 ? 'font-medium text-critical-fg' : 'font-medium text-warning-fg')}>
                      {lit}/{list.length} with signal
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default function OpsFiber() {
  const partner = usePartner()
  const splitters = useStore((s) => s.ops.splitters)
  const onts = useStore((s) => s.ops.onts)
  const properties = useStore((s) => s.ops.properties)
  const [selected, setSelected] = useState<string | null>(null)

  const faults = useMemo(() => locateFiberFaults(splitters, onts), [splitters, onts])

  const counts = useMemo(() => {
    const c: Record<FiberSignal, number> = { signal: 0, 'no-signal': 0, 'no-response': 0 }
    for (const o of onts) c[fiberSignal(o.status)] += 1
    return c
  }, [onts])

  const byLevel = useMemo(() => {
    const c: Record<FaultLevel, number> = { feeder: 0, splitter: 0, drop: 0, 'no-response': 0 }
    for (const f of faults) c[f.level] += 1
    return c
  }, [faults])

  const darkByProperty = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of onts) if (fiberSignal(o.status) === 'no-signal') m.set(o.propertyId, (m.get(o.propertyId) ?? 0) + 1)
    return m
  }, [onts])

  // Default the map to the property with the worst shared outage, else the demo property.
  const propertyId = selected ?? faults.find((f) => f.level === 'feeder' || f.level === 'splitter')?.propertyId ?? DEMO_PROPERTY_ID
  const share = onts.length ? counts.signal / onts.length : 0
  const located = byLevel.feeder + byLevel.splitter + byLevel.drop
  const shared = byLevel.feeder + byLevel.splitter

  const header: { tone: Tone; text: string } = shared
    ? { tone: 'critical', text: `${shared} shared fiber outage${shared > 1 ? 's' : ''}` }
    : located
      ? { tone: 'warning', text: `${located} home${located > 1 ? 's' : ''} without signal` }
      : { tone: 'good', text: 'Light at every responding ONT' }

  return (
    <>
      <PageHeader
        title="Fiber signal"
        subtitle={`Is light reaching each ONT? ${num(onts.length)} ONTs on ${partner.name} fiber, faults located to street, splitter or home`}
        actions={
          <span className="inline-flex items-center gap-2 text-[13px] text-fg-2">
            <StatusDot tone={header.tone} pulse={header.tone === 'critical'} />
            {header.text}
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Homes with signal" value={pct(share, 1)} tone={share < 0.95 ? 'critical' : share < 0.99 ? 'warning' : 'neutral'} hint={`${num(counts.signal)} of ${num(onts.length)}`} />
        <Stat label="No signal" value={counts['no-signal']} tone={counts['no-signal'] ? 'critical' : 'neutral'} hint="ONT powered, no light arriving" />
        <Stat label="Not responding" value={counts['no-response']} hint="No LOS alarm, likely power" />
        <Stat
          label="Faults located"
          value={located}
          tone={shared ? 'critical' : located ? 'warning' : 'neutral'}
          hint={located ? `${byLevel.feeder} street · ${byLevel.splitter} splitter · ${byLevel.drop} drop` : 'No fiber faults'}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card padded={false} className="min-w-0 xl:col-span-8">
          <div className="px-5 pt-5">
            <CardHeader title="Where the fault is" subtitle={`${faults.length} open finding${faults.length === 1 ? '' : 's'}, worst first`} />
          </div>
          {faults.length ? (
            <ul className="divide-y divide-border border-t border-border xl:max-h-[560px] xl:overflow-y-auto">
              {faults.map((f) => (
                <FaultRow key={f.id} fault={f} />
              ))}
            </ul>
          ) : (
            <div className="border-t border-border">
              <EmptyState icon={CircleCheck} title="Every ONT has light" message="No loss-of-signal or not-responding ONTs across the network." />
            </div>
          )}
        </Card>

        <Card className="min-w-0 xl:col-span-4">
          <CardHeader title="How the fault is located" subtitle="Each ONT is compared with its neighbors on the same splitter and feeder" />
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {RULES.map((r) => {
              const Icon = LEVEL_ICON[r.level]
              return (
                <li key={r.level} className="flex gap-3 py-3">
                  <Icon className={cn('mt-0.5 size-4 shrink-0', LEVEL_TONE[r.level] === 'neutral' ? 'text-fg-3' : LEVEL_TONE[r.level] === 'warning' ? 'text-warning-fg' : 'text-critical-fg')} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-fg">{FAULT_LEVEL_LABEL[r.level]}</div>
                    <div className="text-xs text-fg-3">{r.when}</div>
                    <div className="mt-0.5 text-xs text-fg-2">{r.then}</div>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-xs text-fg-3">Uses only the OLT's per-ONT state: light or no light, and whether the ONT reported a power loss before dropping. No dBm readings needed.</p>
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
          <CardHeader title="Signal map" subtitle="Feeder → splitter → homes. Select a home to open it in the GPON view." />
          <div className="flex flex-wrap gap-1.5">
            {properties.map((p) => {
              const darkCount = darkByProperty.get(p.id) ?? 0
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  aria-pressed={p.id === propertyId}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
                    p.id === propertyId ? 'border-accent-line bg-accent-soft text-accent-fg' : 'border-border text-fg-2 hover:border-border-strong hover:text-fg',
                  )}
                >
                  {p.name}
                  {darkCount > 0 && <span className="font-medium text-critical-fg tabular">· {darkCount} no signal</span>}
                </button>
              )
            })}
          </div>
        </div>
        <div className="border-y border-border bg-surface-2 px-5 py-2.5">
          <SignalLegend />
        </div>
        <div className="p-5">
          <SignalMap propertyId={propertyId} faults={faults} />
        </div>
      </Card>
    </>
  )
}
