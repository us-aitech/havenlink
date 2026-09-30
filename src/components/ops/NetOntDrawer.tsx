import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Activity, ChevronRight, ClipboardList, House, RadioTower, TicketPlus } from 'lucide-react'
import { Badge, Button, Drawer, EmptyState, KeyValue, SectionTitle, StatusDot } from '@/components/ui'
import { cn } from '@/lib/cn'
import { dbm, formatDateTime, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import { OntStatusBadge, RxGauge } from './NetParts'
import { ONT_ISSUE } from './NetUtils'
import { PriorityBadge, SlaBadge } from './WoParts'

export function NetOntDrawer({ ontId, onClose }: { ontId: string | null; onClose: () => void }) {
  const now = useNow()
  const ont = useStore((s) => (ontId ? s.ops.onts.find((o) => o.id === ontId) : undefined))
  const splitters = useStore((s) => s.ops.splitters)
  const properties = useStore((s) => s.ops.properties)
  const olts = useStore((s) => s.ops.olts)
  const lightLevels = useStore((s) => s.ops.lightLevels)
  const workOrders = useStore((s) => s.ops.workOrders)
  const homeNetwork = useStore((s) => s.home.network)
  const runLightLevelTest = useStore((s) => s.runLightLevelTest)
  const createWorkOrder = useStore((s) => s.createWorkOrder)
  const [testing, setTesting] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const readings = useMemo(() => lightLevels.filter((l) => l.ontId === ontId).slice(0, 6), [lightLevels, ontId])
  const relatedOrders = useMemo(
    () => (ont ? workOrders.filter((w) => isOpen(w) && (w.ontId === ont.id || (w.splitterId !== undefined && w.splitterId === ont.splitterId))) : []),
    [workOrders, ont],
  )

  if (!ont) return null

  const splitter = splitters.find((s) => s.id === ont.splitterId)
  const feeder = splitters.find((s) => s.id === splitter?.parentId)
  const property = properties.find((p) => p.id === ont.propertyId)
  const olt = olts.find((o) => o.id === (splitter?.oltId ?? property?.oltId))
  const status = ont.isDemoHome ? homeNetwork.status : ont.status
  const rx = ont.isDemoHome ? homeNetwork.rxPowerDbm : ont.rxPowerDbm

  const runTest = () => {
    setTesting(true)
    window.setTimeout(() => {
      runLightLevelTest(ont.id)
      setTesting(false)
    }, 1200)
  }

  const openTicket = () => {
    const issue = ONT_ISSUE[status]
    const wo = createWorkOrder({
      type: 'trouble',
      priority: 'P2',
      title: `${issue} — ${ont.unit}`,
      description: `Opened from the NOC topology view. ONT ${ont.serial} on ${splitter?.name ?? 'splitter'} (${splitter?.cabinet ?? 'cabinet'}). Last Rx ${dbm(rx)}. Verify drop, connectors and splitter port, then re-test light levels.`,
      propertyId: ont.propertyId,
      unit: ont.unit,
      ontId: ont.id,
      source: 'ISP Dispatch',
    })
    setCreatedId(wo.id)
  }

  const telemetry = [
    { label: 'Download', value: homeNetwork.downMbps, unit: 'Mbps' },
    { label: 'Upload', value: homeNetwork.upMbps, unit: 'Mbps' },
    { label: 'Latency', value: homeNetwork.latencyMs, unit: 'ms' },
    { label: 'Packet loss', value: homeNetwork.packetLoss, unit: '%' },
  ]

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {ont.unit}
          {ont.isDemoHome && (
            <Badge tone="accent" icon={House}>
              Demo home
            </Badge>
          )}
        </span>
      }
      subtitle={`${property?.name ?? ont.propertyId} · ${ont.resident}`}
      footer={
        <>
          <Button variant="secondary" size="md" icon={Activity} loading={testing} onClick={runTest} className="flex-1 sm:flex-none">
            {testing ? 'Measuring…' : 'Run light-level test'}
          </Button>
          <Button variant="primary" size="md" icon={TicketPlus} onClick={openTicket} className="flex-1 sm:flex-none">
            Open trouble ticket
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">
        <div className="flex flex-wrap items-center gap-1.5">
          <OntStatusBadge status={status} />
          <Badge tone="neutral" icon={ont.smartHome ? House : undefined}>
            {ont.smartHome ? 'Smart-home unit' : 'Fiber only'}
          </Badge>
          {ont.isDemoHome && homeNetwork.backupActive && (
            <Badge tone="warning" icon={RadioTower}>
              Hub on LTE backup
            </Badge>
          )}
        </div>

        <section>
          <SectionTitle
            action={
              ont.isDemoHome ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-fg-3">
                  <StatusDot tone="good" pulse />
                  Live telemetry
                </span>
              ) : (
                <span className="text-xs text-fg-3">Last test {timeAgo(ont.lastTestAt, now)}</span>
              )
            }
          >
            Receive power
          </SectionTitle>
          <div className="rounded-lg border border-border p-4">
            <RxGauge value={rx} />
          </div>
          {ont.isDemoHome && (
            <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-border sm:grid-cols-4">
              {telemetry.map((m, i) => (
                <div key={m.label} className={cn('px-3 py-2.5', i % 2 === 1 && 'border-l border-border', i >= 2 && 'border-t border-border sm:border-t-0', i === 2 && 'sm:border-l')}>
                  <dt className="text-xs text-fg-3">{m.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-fg tabular">
                    {m.value} <span className="text-xs font-normal text-fg-3">{m.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section>
          <SectionTitle>Details</SectionTitle>
          <div className="divide-y divide-border border-y border-border">
            <KeyValue label="Serial" value={ont.serial} mono />
            <KeyValue label="Resident" value={ont.resident} />
            <KeyValue label="Property" value={property?.name ?? '—'} />
            <KeyValue label="Splitter" value={splitter ? `${splitter.name} · ${splitter.ratio}` : '—'} />
            <KeyValue label="Cabinet or pedestal" value={splitter?.cabinet ?? '—'} />
            <KeyValue label="Feeder" value={feeder ? `${feeder.name} · ${feeder.cabinet}` : '—'} />
            <KeyValue label="OLT" value={olt ? `${olt.name} · ${olt.location}` : '—'} />
            {ont.isDemoHome && <KeyValue label="Tx power" value={`${homeNetwork.txPowerDbm.toFixed(1)} dBm`} />}
            <KeyValue label="Last light test" value={timeAgo(ont.lastTestAt, now)} />
          </div>
        </section>

        <section>
          <SectionTitle>Recent light-level readings</SectionTitle>
          {readings.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {readings.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] text-fg">{formatDateTime(r.at)}</div>
                    <div className="truncate text-xs text-fg-3">
                      {r.point} · {r.by}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs text-fg tabular">{r.dbm.toFixed(1)} dBm</span>
                    <Badge tone={r.pass ? 'good' : 'critical'} className="w-10 justify-center">
                      {r.pass ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-surface-2 px-4 py-3 text-[13px] text-fg-3">No readings on file. Run a light-level test to capture one.</p>
          )}
        </section>

        <section>
          <SectionTitle>Open work orders</SectionTitle>
          {relatedOrders.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {relatedOrders.map((w) => (
                <li key={w.id}>
                  <Link to={`/ops/work-orders?id=${w.id}`} className={cn('-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2', w.id === createdId && 'bg-accent-soft hover:bg-accent-soft')}>
                    <PriorityBadge priority={w.priority} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-fg">{w.title}</div>
                      <div className="font-mono text-xs text-fg-3">{w.number}</div>
                    </div>
                    <SlaBadge wo={w} now={now} className="hidden sm:inline-flex" />
                    <ChevronRight className="size-4 shrink-0 text-fg-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border">
              <EmptyState icon={ClipboardList} title="No open work orders" message="Open a trouble ticket to dispatch a technician to this ONT." />
            </div>
          )}
        </section>
      </div>
    </Drawer>
  )
}
