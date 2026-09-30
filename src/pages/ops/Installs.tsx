import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarPlus } from 'lucide-react'
import { InstPackages } from '@/components/ops/InstPackages'
import { InstPipeline } from '@/components/ops/InstPipeline'
import { InstScheduleModal } from '@/components/ops/InstScheduleModal'
import { DAY_MS, dayOffset, workOrderHref } from '@/components/ops/MntShared'
import { Button, Card, CardHeader, PageHeader, Stat } from '@/components/ui'
import { currency, formatDuration, num, pct } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { SmartPackage } from '@/types'

export default function OpsInstalls() {
  const now = useNow(30_000)
  const navigate = useNavigate()
  const workOrders = useStore((s) => s.ops.workOrders)
  const properties = useStore((s) => s.ops.properties)
  const technicians = useStore((s) => s.ops.technicians)
  const advanceWorkOrder = useStore((s) => s.advanceWorkOrder)
  const [scheduling, setScheduling] = useState<{ pkg: SmartPackage } | null>(null)

  const installs = useMemo(() => workOrders.filter((w) => w.type === 'install'), [workOrders])
  const pipeline = installs.filter(isOpen)
  const closed = installs.filter((w) => !isOpen(w) && w.closedAt)
  const closed30 = closed.filter((w) => (w.closedAt ?? 0) >= now - 30 * DAY_MS)
  const revenue30 = closed30.reduce((sum, w) => sum + w.billable, 0)
  const unassigned = pipeline.filter((w) => !w.assigneeId).length
  const today = pipeline.filter((w) => w.scheduledFor && dayOffset(w.scheduledFor, now) === 0).length
  const cycleTimes = closed.map((w) => Math.max(0, (w.closedAt ?? 0) - (w.scheduledFor ?? w.createdAt)))
  const avgCycle = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0
  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0)
  const smartUnits = properties.reduce((sum, p) => sum + p.smartHomeUnits, 0)
  const adoption = totalUnits ? smartUnits / totalUnits : 0

  return (
    <>
      <PageHeader
        title="Smart-home installs"
        subtitle="From resident scheduling through in-unit installation, WiFi optimization and app onboarding to ticket closure."
        actions={
          <Button variant="primary" icon={CalendarPlus} onClick={() => setScheduling({ pkg: 'Secure' })}>
            Schedule install
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="In pipeline" value={pipeline.length} hint={`${today} today · ${unassigned} unassigned`} />
          <Stat label="Completed, 30 days" value={closed30.length} hint={`${closed.length} closed installs on record`} />
          <Stat label="Avg time to close" value={cycleTimes.length ? formatDuration(avgCycle) : '—'} hint={`Scheduled to closed, ${cycleTimes.length} installs`} />
          <Stat label="Install revenue, 30 days" value={currency(revenue30)} hint="Billable fees on closed tickets" />
        </div>

        <Card padded={false} className="overflow-hidden">
          <div className="px-5 pt-5">
            <CardHeader title="Install pipeline" subtitle="Select a card to open its work order. Advance moves it to the next stage." />
          </div>
          <InstPipeline
            installs={installs}
            properties={properties}
            technicians={technicians}
            now={now}
            onAdvance={(id) => advanceWorkOrder(id)}
            onOpen={(id) => navigate(workOrderHref(id))}
          />
        </Card>

        <section>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-sm font-semibold text-fg">Smart-home packages</h2>
              <p className="mt-0.5 text-[13px] text-fg-3">Unit counts are estimated from each property’s standard package.</p>
            </div>
            <p className="text-[13px] text-fg-3">
              Portfolio adoption <span className="font-medium text-fg tabular">{pct(adoption)}</span>
              <span className="tabular">
                {' '}
                · {num(smartUnits)} of {num(totalUnits)} units
              </span>
            </p>
          </div>
          <InstPackages properties={properties} onSchedule={(pkg) => setScheduling({ pkg })} />
        </section>
      </div>
      {scheduling && <InstScheduleModal initialPackage={scheduling.pkg} onClose={() => setScheduling(null)} />}
    </>
  )
}
