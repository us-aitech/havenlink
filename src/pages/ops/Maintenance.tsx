import { useMemo } from 'react'
import { MntAssetRegister } from '@/components/ops/MntAssetRegister'
import { MntLightLevels } from '@/components/ops/MntLightLevels'
import { MntOverdueCallout, MntScheduleList, slotOf, type ScheduleContext } from '@/components/ops/MntSchedule'
import { ASSET_KIND_LABEL, DAY_MS, daysFromNowAt, startOfDay } from '@/components/ops/MntShared'
import { PageHeader, Stat } from '@/components/ui'
import { formatDateTime, pct } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { Asset, WorkOrder } from '@/types'

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

  const ctx: ScheduleContext = { propertyById, assetById, techById, now, onAdvance: (id) => advanceWorkOrder(id) }

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
      <PageHeader title="Preventive maintenance" subtitle="Scheduled inspections, light-level testing, cabinet and pedestal checks, and as-built documentation." />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Upcoming, 14 days"
            value={upcoming.length}
            hint={upcoming.length ? `Next ${formatDateTime(slotOf(upcoming[0]))} · ${upcomingUnassigned} unassigned` : 'Nothing scheduled'}
          />
          <Stat label="Overdue" value={overdue.length} tone={overdue.length ? 'critical' : 'neutral'} hint={overdue.length ? 'Past the 4-hour arrival window' : 'All inspections on time'} />
          <Stat
            label="Assets flagged"
            value={flagged.length}
            tone={poorCount ? 'warning' : 'neutral'}
            hint={`${poorCount} poor · ${flagged.length - poorCount} fair of ${assets.length}`}
          />
          <Stat
            label="Light-level pass rate"
            value={pct(passRate)}
            tone={passRate >= 0.95 ? 'neutral' : 'warning'}
            hint={`${passCount} of ${lightLevels.length} readings above −27 dBm`}
          />
        </div>

        <MntOverdueCallout overdue={overdue} ctx={ctx} />

        <MntScheduleList groups={groups} total={openMaintenance.length} ctx={ctx} />

        <MntAssetRegister assets={assets} properties={properties} openByAsset={openByAsset} now={now} onSchedule={scheduleInspection} />

        <MntLightLevels lightLevels={lightLevels} onts={onts} properties={properties} now={now} onRetest={runLightLevelTest} />
      </div>
    </>
  )
}
