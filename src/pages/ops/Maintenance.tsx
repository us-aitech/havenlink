import { useMemo } from 'react'
import { Link } from 'react-router'
import { Building2, CalendarClock, CalendarDays, ChevronsRight, ClipboardCheck, ExternalLink, Gauge, ShieldAlert, TriangleAlert, Wrench } from 'lucide-react'
import { MntAssetRegister } from '@/components/ops/MntAssetRegister'
import { MntLightLevels } from '@/components/ops/MntLightLevels'
import {
  ASSET_KIND_ICON,
  ASSET_KIND_LABEL,
  AssigneeChip,
  DAY_MS,
  LINK_BUTTON,
  MNT_STAGE_TONE,
  dayHeading,
  daysFromNowAt,
  startOfDay,
  workOrderHref,
} from '@/components/ops/MntShared'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Stat } from '@/components/ui'
import { formatDate, formatDateTime, formatDuration, formatTime, pct } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { PRIORITY_TONE, isOpen, nextStage, stageLabel } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { Asset, Property, Technician, WorkOrder } from '@/types'

function slotOf(wo: WorkOrder): number {
  return wo.scheduledFor ?? wo.dueAt
}

interface RowContext {
  propertyById: Map<string, Property>
  assetById: Map<string, Asset>
  techById: Map<string, Technician>
  now: number
  onAdvance: (id: string) => void
}

function ScheduleRow({ wo, ctx, showDate }: { wo: WorkOrder; ctx: RowContext; showDate?: boolean }) {
  const asset = wo.assetId ? ctx.assetById.get(wo.assetId) : undefined
  const property = ctx.propertyById.get(wo.propertyId)
  const tech = wo.assigneeId ? ctx.techById.get(wo.assigneeId) : undefined
  const next = nextStage(wo)
  const overdue = wo.dueAt < ctx.now
  const AssetIcon = asset ? ASSET_KIND_ICON[asset.kind] : null
  const slot = slotOf(wo)

  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 xl:flex-row xl:items-center xl:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="w-16 shrink-0 pt-0.5">
          <div className="font-mono text-xs text-fg tabular">{formatTime(slot)}</div>
          {showDate && <div className="mt-0.5 text-[11px] text-fg-3">{formatDate(slot)}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-fg-3">{wo.number}</span>
            <Badge tone={PRIORITY_TONE[wo.priority]}>{wo.priority}</Badge>
            {overdue && (
              <Badge tone="critical" icon={TriangleAlert}>
                Overdue {formatDuration(ctx.now - wo.dueAt)}
              </Badge>
            )}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-fg">{wo.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" />
              {property?.name ?? wo.propertyId}
            </span>
            {asset && AssetIcon && (
              <span className="inline-flex items-center gap-1">
                <AssetIcon className="size-3" />
                <span className="font-mono">{asset.name}</span> · {ASSET_KIND_LABEL[asset.kind]}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-[76px] xl:justify-end xl:pl-0">
        <div className="min-w-0 xl:w-32">
          <AssigneeChip tech={tech} />
        </div>
        <Badge tone={MNT_STAGE_TONE[wo.stage] ?? 'info'} dot>
          {stageLabel(wo)}
        </Badge>
        <div className="flex items-center gap-1.5">
          {next && (
            <Button size="xs" icon={ChevronsRight} onClick={() => ctx.onAdvance(wo.id)} title={`Advance to “${next.label}”`}>
              Advance
            </Button>
          )}
          <Link to={workOrderHref(wo.id)} className={LINK_BUTTON}>
            Open
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OpsMaintenance() {
  const now = useNow(10_000)
  const workOrders = useStore((s) => s.ops.workOrders)
  const assets = useStore((s) => s.ops.assets)
  const properties = useStore((s) => s.ops.properties)
  const technicians = useStore((s) => s.ops.technicians)
  const lightLevels = useStore((s) => s.ops.lightLevels)
  const onts = useStore((s) => s.ops.onts)
  const advanceWorkOrder = useStore((s) => s.advanceWorkOrder)
  const createWorkOrder = useStore((s) => s.createWorkOrder)
  const runLightLevelTest = useStore((s) => s.runLightLevelTest)

  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties])
  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const techById = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians])

  const openMaintenance = useMemo(
    () => workOrders.filter((w) => w.type === 'maintenance' && isOpen(w)).sort((a, b) => slotOf(a) - slotOf(b)),
    [workOrders],
  )
  const openByAsset = useMemo(() => {
    const map = new Map<string, WorkOrder>()
    for (const w of openMaintenance) if (w.assetId && !map.has(w.assetId)) map.set(w.assetId, w)
    return map
  }, [openMaintenance])

  const overdue = openMaintenance.filter((w) => w.dueAt < now)
  const upcoming = openMaintenance.filter((w) => w.dueAt >= now && slotOf(w) <= now + 14 * DAY_MS)
  const upcomingUnassigned = upcoming.filter((w) => !w.assigneeId).length
  const flagged = assets.filter((a) => a.condition !== 'good')
  const poorCount = flagged.filter((a) => a.condition === 'poor').length
  const passCount = lightLevels.filter((l) => l.pass).length
  const passRate = lightLevels.length ? passCount / lightLevels.length : 1
  const inspectedRecently = assets.filter((a) => now - a.lastInspectedAt <= 90 * DAY_MS).length
  const inspectedRate = assets.length ? inspectedRecently / assets.length : 0

  const groups = useMemo(() => {
    const map = new Map<number, WorkOrder[]>()
    for (const w of openMaintenance) {
      const key = startOfDay(slotOf(w))
      const list = map.get(key)
      if (list) list.push(w)
      else map.set(key, [w])
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [openMaintenance])

  const ctx: RowContext = { propertyById, assetById, techById, now, onAdvance: (id) => advanceWorkOrder(id) }

  function scheduleInspection(asset: Asset) {
    const property = propertyById.get(asset.propertyId)
    createWorkOrder({
      type: 'maintenance',
      priority: asset.condition === 'poor' ? 'P2' : 'P3',
      title: `Inspection — ${asset.name}`,
      description: `${ASSET_KIND_LABEL[asset.kind]} inspection at ${property?.name ?? 'property'} (condition: ${asset.condition}). Check enclosure, seals and grounding; clean and inspect connectors; verify port labeling; run light-level tests at splitter outputs; update as-built documentation with photos.`,
      propertyId: asset.propertyId,
      assetId: asset.id,
      source: 'Scheduled',
      scheduledFor: daysFromNowAt(now, 1, 9),
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Fiber / GPON maintenance"
        title="Preventive maintenance"
        subtitle="Scheduled inspections, light-level testing, cabinet and pedestal checks, and documentation updates."
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Stat
            label="Inspections · next 14 days"
            value={upcoming.length}
            icon={CalendarDays}
            tone="info"
            hint={upcoming.length ? `${upcomingUnassigned} unassigned · next ${formatDateTime(slotOf(upcoming[0]))}` : 'Nothing scheduled'}
          />
          <Stat
            label="Overdue"
            value={overdue.length}
            icon={overdue.length ? TriangleAlert : ClipboardCheck}
            tone={overdue.length ? 'critical' : 'good'}
            hint={overdue.length ? 'Past the 4-hour arrival window' : 'All inspections on time'}
          />
          <Stat
            label="Assets fair / poor"
            value={flagged.length}
            icon={ShieldAlert}
            tone={poorCount ? 'warning' : 'good'}
            hint={`${poorCount} poor · ${flagged.length - poorCount} fair of ${assets.length}`}
          />
          <Stat
            label="Light-level pass rate"
            value={pct(passRate)}
            icon={Gauge}
            tone={passRate >= 0.95 ? 'good' : 'warning'}
            hint={`${passCount} of ${lightLevels.length} readings above −27 dBm`}
          />
          <Stat
            label="Inspected · last 90 days"
            value={pct(inspectedRate)}
            icon={Wrench}
            tone={inspectedRate >= 0.8 ? 'good' : 'warning'}
            hint={`${inspectedRecently} of ${assets.length} assets`}
            className="col-span-2 md:col-span-1"
          />
        </div>

        {overdue.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-critical-line bg-critical-soft">
            <div className="flex items-start gap-3 px-5 pt-4 pb-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-critical-soft text-critical-fg ring-1 ring-critical-line">
                <TriangleAlert className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-critical-fg">
                  {overdue.length} overdue {overdue.length === 1 ? 'inspection' : 'inspections'}
                </h3>
                <p className="mt-0.5 text-xs text-critical-fg">Missed the scheduled window. Advance, reassign or reschedule from the work order.</p>
              </div>
            </div>
            <div className="divide-y divide-critical-line border-t border-critical-line">
              {overdue.map((wo) => (
                <ScheduleRow key={wo.id} wo={wo} ctx={ctx} showDate />
              ))}
            </div>
          </section>
        )}

        <Card padded={false}>
          <div className="p-5 pb-4">
            <CardHeader
              title="Schedule"
              subtitle={`${openMaintenance.length} open maintenance work orders · grouped by day`}
              icon={CalendarClock}
              className="mb-0!"
            />
          </div>
          {groups.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState icon={CalendarClock} title="No open maintenance" message="Schedule an inspection from the asset register below." />
            </div>
          ) : (
            groups.map(([day, list]) => {
              const heading = dayHeading(day, now)
              return (
                <div key={day} className="border-t border-border">
                  <div className="flex items-center justify-between gap-3 bg-surface-2 px-5 py-2">
                    <div className="text-xs font-medium text-fg-2">
                      {heading.relative && <span className="text-accent-fg">{heading.relative} · </span>}
                      {heading.date}
                    </div>
                    <span className="text-[11px] text-fg-3 tabular">
                      {list.length} {list.length === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                  <div className="divide-y divide-border border-t border-border">
                    {list.map((wo) => (
                      <ScheduleRow key={wo.id} wo={wo} ctx={ctx} />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </Card>

        <MntAssetRegister assets={assets} properties={properties} openByAsset={openByAsset} now={now} onSchedule={scheduleInspection} />

        <MntLightLevels lightLevels={lightLevels} onts={onts} properties={properties} now={now} onRetest={runLightLevelTest} />
      </div>
    </>
  )
}
