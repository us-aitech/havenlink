import { useState } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { StackedBarChart, type BarSeries } from '@/components/charts/StackedBarChart'
import { Card, CardHeader, Segmented } from '@/components/ui'
import { currency } from '@/lib/format'
import type { RevenueMonth } from '@/types'
import { REVENUE_STREAMS, compactUsd, monthTotal } from './RevStreams'

type View = 'chart' | 'table'

const SERIES_DEF: BarSeries[] = REVENUE_STREAMS.map((s) => ({ key: s.key, label: s.label, color: s.color }))

export function RevStreamChart({ revenue }: { revenue: RevenueMonth[] }) {
  const [view, setView] = useState<View>('chart')
  const first = revenue[0]
  const last = revenue[revenue.length - 1]
  const grandTotal = revenue.reduce((sum, r) => sum + monthTotal(r), 0)

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CardHeader
          title="Monthly revenue by stream"
          subtitle={first && last ? `${first.month} – ${last.month} · USD · hover a bar for the breakdown` : 'USD'}
          icon={ChartColumn}
          className="mb-0!"
        />
        <Segmented<View>
          size="sm"
          value={view}
          onChange={setView}
          className="self-start"
          options={[
            { value: 'chart', label: 'Chart', icon: ChartColumn },
            { value: 'table', label: 'Table', icon: Table2 },
          ]}
        />
      </div>
      {view === 'chart' ? (
        <StackedBarChart<RevenueMonth>
          data={revenue}
          xKey="month"
          series={SERIES_DEF}
          height={280}
          formatValue={(v) => currency(v)}
          formatAxis={compactUsd}
          label="Stacked bar chart of monthly revenue by stream"
        />
      ) : (
        <div className="relative -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] tracking-wider text-fg-3 uppercase">
                <th className="py-2 pr-3 font-medium">Month</th>
                {REVENUE_STREAMS.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <span className="size-2 shrink-0 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  </th>
                ))}
                <th className="py-2 pl-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenue.map((r) => (
                <tr key={r.month} className="transition hover:bg-surface-3">
                  <td className="py-2.5 pr-3 font-medium text-fg">{r.month}</td>
                  {REVENUE_STREAMS.map((s) => (
                    <td key={s.key} className="px-3 py-2.5 text-right text-fg-2 tabular">
                      {currency(r[s.key])}
                    </td>
                  ))}
                  <td className="py-2.5 pl-3 text-right font-semibold text-fg tabular">{currency(monthTotal(r))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-strong">
                <td className="py-2.5 pr-3 text-xs font-semibold tracking-wider text-fg-3 uppercase">Total</td>
                {REVENUE_STREAMS.map((s) => (
                  <td key={s.key} className="px-3 py-2.5 text-right font-medium text-fg tabular">
                    {currency(revenue.reduce((sum, r) => sum + r[s.key], 0))}
                  </td>
                ))}
                <td className="py-2.5 pl-3 text-right font-semibold text-accent-fg tabular">{currency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}
