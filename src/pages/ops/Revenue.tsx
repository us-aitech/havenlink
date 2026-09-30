import { useMemo } from 'react'
import { CalendarRange, CircleDollarSign, House, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'
import { PACKAGES } from '@/components/ops/InstPackages'
import { DAY_MS } from '@/components/ops/MntShared'
import { RevArpuCalculator } from '@/components/ops/RevArpuCalculator'
import { RevBenefits } from '@/components/ops/RevBenefits'
import { RevModelCard } from '@/components/ops/RevModelCard'
import { RevStreamChart } from '@/components/ops/RevStreamChart'
import { REVENUE_STREAMS, compactUsd, monthTotal } from '@/components/ops/RevStreams'
import { PageHeader, Stat } from '@/components/ui'
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
      <PageHeader eyebrow="Partner economics" title="Revenue" subtitle="Revenue model options from the partner expansion proposal" />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Stat label={`This month · ${last?.month ?? '—'}`} value={currency(lastTotal)} icon={CircleDollarSign} tone="accent" hint={`Across ${REVENUE_STREAMS.length} revenue streams`} />
          <Stat
            label="Month over month"
            value={signedPct(mom)}
            icon={mom >= 0 ? TrendingUp : TrendingDown}
            tone={mom >= 0 ? 'good' : 'warning'}
            hint={driver && prev ? `vs ${prev.month} · ${driver.label} ${signedUsd(driver.delta)}` : undefined}
          />
          <Stat label="6-month total" value={currency(sixMonth)} icon={CalendarRange} tone="info" hint={first && last ? `${first.month} – ${last.month} · avg ${currency(sixMonth / revenue.length)}/mo` : undefined} />
          <Stat
            label="Smart-home growth"
            value={signedPct(smartGrowth)}
            icon={House}
            tone={smartGrowth >= 0 ? 'good' : 'warning'}
            hint={first && last ? `${last.month} vs ${first.month} · ${compactUsd(first.smartHome)} → ${compactUsd(last.smartHome)}/mo` : undefined}
          />
          <Stat
            label="Live billables · 30 days"
            value={currency(billables.total)}
            icon={ReceiptText}
            tone="good"
            hint={`${billables.count} billable work orders closed`}
            className="col-span-2 md:col-span-1"
          />
        </div>

        <RevStreamChart revenue={revenue} />

        <div className="grid gap-6 xl:grid-cols-5">
          <div className="min-w-0 xl:col-span-3">
            <RevModelCard month={last} />
          </div>
          <div className="min-w-0 xl:col-span-2">
            <RevBenefits />
          </div>
        </div>

        <RevArpuCalculator portfolio={portfolio} />
      </div>
    </>
  )
}
