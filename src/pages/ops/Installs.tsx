import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarPlus, CircleCheck, CircleDollarSign, House, Timer, Workflow } from 'lucide-react'
import { InstPackages } from '@/components/ops/InstPackages'
import { InstPipeline } from '@/components/ops/InstPipeline'
import { InstScheduleModal } from '@/components/ops/InstScheduleModal'
import { DAY_MS, dayOffset, workOrderHref } from '@/components/ops/MntShared'
import { Button, Card, CardHeader, PageHeader, SectionTitle, Stat } from '@/components/ui'
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
        eyebrow="In-unit technology"
        title="Smart-home installs"
        subtitle="Resident scheduling → in-unit installation → WiFi optimization → app onboarding → support ticket closure."
        actions={
          <Button variant="primary" icon={CalendarPlus} onClick={() => setScheduling({ pkg: 'Secure' })}>
            Schedule install
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Stat label="Completed · 30 days" value={closed30.length} icon={CircleCheck} tone="good" hint={`${closed.length} closed installs on record`} />
          <Stat label="In pipeline" value={pipeline.length} icon={Workflow} tone="accent" hint={`${today} today · ${unassigned} unassigned`} />
          <Stat
            label="Avg scheduled → closed"
            value={cycleTimes.length ? formatDuration(avgCycle) : '—'}
            icon={Timer}
            tone="info"
            hint={`Across ${cycleTimes.length} completed installs`}
          />
          <Stat label="Install revenue · 30 days" value={currency(revenue30)} icon={CircleDollarSign} tone="good" hint="Billable install fees on closed tickets" />
          <Stat
            label="Portfolio adoption"
            value={pct(adoption)}
            icon={House}
            tone="accent"
            hint={`${num(smartUnits)} of ${num(totalUnits)} units`}
            className="col-span-2 md:col-span-1"
          />
        </div>

        <Card>
          <CardHeader
            title="Install pipeline"
            subtitle="Click a card for the full work order · Advance moves it to the next workflow stage"
            icon={Workflow}
          />
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
          <SectionTitle action={<span className="text-[11px] text-fg-3">Unit counts estimated from each property’s standard package</span>}>
            Smart-home packages
          </SectionTitle>
          <InstPackages properties={properties} onSchedule={(pkg) => setScheduling({ pkg })} />
        </section>
      </div>
      {scheduling && <InstScheduleModal initialPackage={scheduling.pkg} onClose={() => setScheduling(null)} />}
    </>
  )
}
