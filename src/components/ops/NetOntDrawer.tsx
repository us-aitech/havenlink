import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Activity, ChevronRight, ClipboardList, Gauge, House, RadioTower, TicketPlus } from 'lucide-react'
import { Badge, Button, Drawer, EmptyState, KeyValue, SectionTitle } from '@/components/ui'
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
          <Button variant="secondary" size="sm" icon={Activity} loading={testing} onClick={runTest} className="flex-1 sm:flex-none">
            {testing ? 'Measuring…' : 'Run remote light-level test'}
          </Button>
          <Button variant="primary" size="sm" icon={TicketPlus} onClick={openTicket} className="flex-1 sm:flex-none">
            Open trouble ticket
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <OntStatusBadge status={status} />
          {ont.smartHome ? (
            <Badge tone="accent" icon={House}>
              Smart-home unit
            </Badge>
          ) : (
            <Badge tone="neutral">Fiber only</Badge>
          )}
          {ont.isDemoHome && homeNetwork.backupActive && (
            <Badge tone="warning" icon={RadioTower}>
              Hub on LTE backup
            </Badge>
          )}
        </div>

        <section className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-fg-3 uppercase">
              <Gauge className="size-3.5" />
              Receive power
            </span>
            {ont.isDemoHome && (
              <span className="flex items-center gap-1.5 text-[11px] text-accent-fg">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                Live telemetry
              </span>
            )}
          </div>
          <RxGauge value={rx} />
          {ont.isDemoHome && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Down', value: `${homeNetwork.downMbps}`, unit: 'Mbps' },
                { label: 'Up', value: `${homeNetwork.upMbps}`, unit: 'Mbps' },
                { label: 'Latency', value: `${homeNetwork.latencyMs}`, unit: 'ms' },
                { label: 'Loss', value: `${homeNetwork.packetLoss}`, unit: '%' },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-surface-2 px-2.5 py-2 ring-1 ring-border ring-inset">
                  <div className="text-[10px] text-fg-3 uppercase">{m.label}</div>
                  <div className="text-sm font-semibold text-fg tabular">
                    {m.value} <span className="text-[10px] font-normal text-fg-3">{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Details</SectionTitle>
          <div className="divide-y divide-border rounded-xl border border-border px-4">
            <KeyValue label="Serial" value={ont.serial} mono />
            <KeyValue label="Unit" value={ont.unit} />
            <KeyValue label="Resident" value={ont.resident} />
            <KeyValue label="Property" value={property?.name ?? '—'} />
            <KeyValue label="Splitter" value={splitter ? `${splitter.name} · ${splitter.ratio}` : '—'} />
            <KeyValue label="Cabinet / pedestal" value={splitter?.cabinet ?? '—'} />
            <KeyValue label="Feeder" value={feeder ? `${feeder.name} · ${feeder.cabinet}` : '—'} />
            <KeyValue label="OLT" value={olt ? `${olt.name} · ${olt.location}` : '—'} />
            <KeyValue label="Smart home" value={ont.smartHome ? 'Yes' : 'No'} />
            {ont.isDemoHome && <KeyValue label="Tx power" value={`${homeNetwork.txPowerDbm.toFixed(1)} dBm`} />}
            <KeyValue label="Last light test" value={timeAgo(ont.lastTestAt, now)} />
          </div>
        </section>

        <section>
          <SectionTitle>Recent light-level readings</SectionTitle>
          {readings.length ? (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {readings.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                  <div className="min-w-0">
                    <div className="text-fg-2">{formatDateTime(r.at)}</div>
                    <div className="truncate text-fg-3">
                      {r.point} · {r.by}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-fg">{r.dbm.toFixed(1)} dBm</span>
                    <Badge tone={r.pass ? 'good' : 'critical'}>{r.pass ? 'Pass' : 'Fail'}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-fg-3">No readings on file. Run a remote test to capture one.</div>
          )}
        </section>

        <section>
          <SectionTitle>Open work orders</SectionTitle>
          {relatedOrders.length ? (
            <ul className="flex flex-col gap-2">
              {relatedOrders.map((w) => (
                <li key={w.id}>
                  <Link
                    to={`/ops/work-orders?id=${w.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border bg-surface-2 px-3 py-2.5 transition hover:border-border-strong hover:bg-surface-3',
                      w.id === createdId ? 'border-accent-line' : 'border-border',
                    )}
                  >
                    <PriorityBadge priority={w.priority} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-fg">{w.title}</div>
                      <div className="font-mono text-[11px] text-fg-3">{w.number}</div>
                    </div>
                    <SlaBadge wo={w} now={now} className="hidden sm:inline-flex" />
                    <ChevronRight className="size-4 shrink-0 text-fg-3" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ClipboardList} title="No open work orders" message="Open a trouble ticket to dispatch a technician to this ONT." />
          )}
        </section>
      </div>
    </Drawer>
  )
}
