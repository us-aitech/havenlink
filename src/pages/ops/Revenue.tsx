import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { PACKAGES } from '@/components/ops/InstPackages'
import { DAY_MS } from '@/components/ops/MntShared'
import { RevArpuCalculator } from '@/components/ops/RevArpuCalculator'
import { RevBenefits } from '@/components/ops/RevBenefits'
import { RevModelCard } from '@/components/ops/RevModelCard'
import { RevStreamChart } from '@/components/ops/RevStreamChart'
import { REVENUE_STREAMS, compactUsd, monthTotal } from '@/components/ops/RevStreams'
import { PageHeader, Stat } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { useStore } from '@/store/useStore'

function signedPct(ratio: number): string {
  const value = Math.abs(ratio * 100).toFixed(1)
  return `${ratio >= 0 ? '+' : '−'}${value}%`
}

function signedUsd(value: number): string {
  return `${value >= 0 ? '+' : '−'}${compactUsd(Math.abs(value))}`
}

function Delta({ ratio }: { ratio: number }) {
  const up = ratio >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium tabular', up ? 'text-good-fg' : 'text-critical-fg')}>
      <Icon className="size-3.5" />
      {signedPct(ratio)}
    </span>
  )
}

export default function OpsRevenue() {
  const now = useNow(60_000)
  const revenue = useStore((s) => s.ops.revenue)
  const workOrders = useStore((s) => s.ops.workOrders)
  const properties = useStore((s) => s.ops.properties)

  const first = revenue[0]
  const last = revenue[revenue.length - 1]
  const prev = revenue[revenue.length - 2]
  const lastTotal = last ? monthTotal(last) : 0
  const prevTotal = prev ? monthTotal(prev) : 0
  const mom = prevTotal ? (lastTotal - prevTotal) / prevTotal : 0
  const sixMonth = revenue.reduce((sum, r) => sum + monthTotal(r), 0)
  const smartGrowth = first && last && first.smartHome ? (last.smartHome - first.smartHome) / first.smartHome : 0

  const driver = useMemo(() => {
    if (!last || !prev) return null
    return REVENUE_STREAMS.map((s) => ({ label: s.label, delta: last[s.key] - prev[s.key] })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
  }, [last, prev])

  const billables = useMemo(() => {
    const closed = workOrders.filter((w) => w.closedAt && w.closedAt >= now - 30 * DAY_MS && w.billable > 0)
    return { count: closed.length, total: closed.reduce((sum, w) => sum + w.billable, 0) }
  }, [workOrders, now])

  const portfolio = useMemo(() => {
    const units = properties.reduce((sum, p) => sum + p.units, 0)
    const smart = properties.reduce((sum, p) => sum + p.smartHomeUnits, 0)
    const weighted = properties.reduce((sum, p) => sum + p.smartHomeUnits * (PACKAGES.find((x) => x.id === p.package)?.monthly ?? 0), 0)
    return { units, adoption: units ? (smart / units) * 100 : 0, price: smart ? weighted / smart : PACKAGES[1].monthly }
  }, [properties])

  return (
    <>
      <PageHeader title="Revenue" subtitle="Partner economics across the five revenue models in the expansion proposal." />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label={last ? `Revenue, ${last.month}` : 'Revenue this month'}
            value={currency(lastTotal)}
            hint={
              prev ? (
                <span>
                  <Delta ratio={mom} /> vs {prev.month}
                  {driver ? ` · ${driver.label} ${signedUsd(driver.delta)}` : ''}
                </span>
              ) : undefined
            }
          />
          <Stat label="Six-month total" value={currency(sixMonth)} hint={first && last && revenue.length ? `${first.month} – ${last.month} · avg ${currency(sixMonth / revenue.length)}/mo` : undefined} />
          <Stat
            label="Smart-home share growth"
            value={signedPct(smartGrowth)}
            hint={first && last ? `${compactUsd(first.smartHome)} in ${first.month} to ${compactUsd(last.smartHome)} in ${last.month}` : undefined}
          />
          <Stat label="Live billables, 30 days" value={currency(billables.total)} hint={`${billables.count} billable work orders closed`} />
        </div>

        <RevStreamChart revenue={revenue} />

        <RevModelCard month={last} />

        <RevArpuCalculator portfolio={portfolio} />

        <RevBenefits />
      </div>
    </>
  )
}
