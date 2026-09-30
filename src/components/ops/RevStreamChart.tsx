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
    <Card padded={false} className={view === 'table' ? 'overflow-hidden' : undefined}>
      <div className="px-5 pt-5">
        <CardHeader
          title="Monthly revenue by stream"
          subtitle={first && last ? `${first.month} – ${last.month}, USD` : 'USD'}
          action={
            <Segmented<View>
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart', icon: ChartColumn },
                { value: 'table', label: 'Table', icon: Table2 },
              ]}
            />
          }
        />
      </div>
      {view === 'chart' ? (
        <div className="px-5 pb-5">
          <StackedBarChart<RevenueMonth>
            data={revenue}
            xKey="month"
            series={SERIES_DEF}
            height={280}
            formatValue={(v) => currency(v)}
            formatAxis={compactUsd}
            label={`Stacked bar chart of monthly revenue by stream${first && last ? `, ${first.month} to ${last.month}` : ''}`}
          />
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
                <th className="px-5 py-2 font-medium">Month</th>
                {REVENUE_STREAMS.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <span className="size-2 shrink-0 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  </th>
                ))}
                <th className="px-5 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revenue.map((r) => (
                <tr key={r.month} className="transition-colors hover:bg-surface-2">
                  <td className="px-5 py-2.5 font-medium text-fg">{r.month}</td>
                  {REVENUE_STREAMS.map((s) => (
                    <td key={s.key} className="px-3 py-2.5 text-right text-fg-2 tabular">
                      {currency(r[s.key])}
                    </td>
                  ))}
                  <td className="px-5 py-2.5 text-right font-medium text-fg tabular">{currency(monthTotal(r))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-2">
                <td className="px-5 py-2.5 font-medium text-fg">Total</td>
                {REVENUE_STREAMS.map((s) => (
                  <td key={s.key} className="px-3 py-2.5 text-right font-medium text-fg tabular">
                    {currency(revenue.reduce((sum, r) => sum + r[s.key], 0))}
                  </td>
                ))}
                <td className="px-5 py-2.5 text-right font-semibold text-fg tabular">{currency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}
