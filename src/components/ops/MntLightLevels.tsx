import { useMemo, useState } from 'react'
import { CircleCheck, CircleX, Gauge, RefreshCw, TriangleAlert } from 'lucide-react'
import { BarChart, type BarDatum } from '@/components/charts/BarChart'
import { SERIES } from '@/components/charts/palette'
import { Badge, Button, Card, CardHeader, EmptyState, IconButton } from '@/components/ui'
import { num, pct, timeAgo } from '@/lib/format'
import type { LightLevelReading, Ont, Property } from '@/types'

const THRESHOLD_DBM = -27
const BIN_CENTERS = [-14, -16, -18, -20, -22, -24, -26, -28, -30]
const DEFAULT_ROWS = 8

function signed(value: number, digits = 1): string {
  return `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`
}

function binIndex(dbm: number): number {
  return Math.min(BIN_CENTERS.length - 1, Math.max(0, Math.floor((-13 - dbm) / 2)))
}

interface Props {
  lightLevels: LightLevelReading[]
  onts: Ont[]
  properties: Property[]
  now: number
  onRetest: (ontId: string) => void
}

export function MntLightLevels({ lightLevels, onts, properties, now, onRetest }: Props) {
  const [expanded, setExpanded] = useState(false)
  const ontById = useMemo(() => new Map(onts.map((o) => [o.id, o])), [onts])
  const propertyName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties])
  const readings = useMemo(() => [...lightLevels].sort((a, b) => b.at - a.at), [lightLevels])
  const visible = expanded ? readings : readings.slice(0, DEFAULT_ROWS)
  const passCount = readings.filter((r) => r.pass).length

  const distribution = useMemo(() => {
    const bins: BarDatum[] = BIN_CENTERS.map((c) => ({ label: signed(c, 0), value: 0, muted: c < THRESHOLD_DBM }))
    const values: number[] = []
    for (const o of onts) {
      if (o.rxPowerDbm === null) continue
      values.push(o.rxPowerDbm)
      bins[binIndex(o.rxPowerDbm)].value += 1
    }
    values.sort((a, b) => a - b)
    const median = values.length ? values[Math.floor(values.length / 2)] : null
    const below = values.filter((v) => v <= THRESHOLD_DBM).length
    return {
      bins,
      reporting: values.length,
      noLight: onts.length - values.length,
      below,
      median,
      strongest: values.length ? values[values.length - 1] : null,
      weakest: values.length ? values[0] : null,
    }
  }, [onts])

  return (
    <Card padded={false}>
      <div className="p-5 pb-0">
        <CardHeader
          title="Light-level testing"
          subtitle="ONT receive power at splitter and ONT test points · pass threshold −27 dBm"
          icon={Gauge}
          action={
            <Badge tone={passCount === readings.length ? 'good' : 'warning'} icon={passCount === readings.length ? CircleCheck : TriangleAlert}>
              {readings.length ? pct(passCount / readings.length) : '—'} pass
            </Badge>
          }
        />
      </div>
      <div className="grid lg:grid-cols-5">
        <div className="min-w-0 border-t border-border lg:col-span-3">
          <div className="flex items-center justify-between gap-3 px-5 py-2.5">
            <h4 className="text-xs font-semibold tracking-wider text-fg-3 uppercase">Recent readings</h4>
            <span className="text-xs text-fg-3 tabular">
              {passCount} pass · {readings.length - passCount} fail
            </span>
          </div>
          {readings.length === 0 ? (
            <EmptyState icon={Gauge} title="No readings yet" message="Remote polls and field tests will appear here." />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-[11px] tracking-wider text-fg-3 uppercase">
                    <th className="px-5 py-2 font-medium">ONT</th>
                    <th className="px-3 py-2 font-medium">Point</th>
                    <th className="px-3 py-2 text-right font-medium">Rx power</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="px-3 py-2 font-medium">By</th>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="w-10 px-3 py-2">
                      <span className="sr-only">Retest</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((r) => {
                    const ont = ontById.get(r.ontId)
                    return (
                      <tr key={r.id} className="transition hover:bg-surface-3">
                        <td className="px-5 py-2.5">
                          <div className="truncate text-fg">{ont?.unit ?? r.ontId}</div>
                          <div className="truncate text-[11px] text-fg-3">{ont ? propertyName.get(ont.propertyId) : '—'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-fg-3">{r.point}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-fg tabular">{r.dbm <= -40 ? 'No light' : `${signed(r.dbm)} dBm`}</td>
                        <td className="px-3 py-2.5">
                          {r.pass ? (
                            <Badge tone="good" icon={CircleCheck}>
                              PASS
                            </Badge>
                          ) : (
                            <Badge tone="critical" icon={CircleX}>
                              FAIL
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-fg-3">{r.by}</td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap text-fg-3 tabular">{timeAgo(r.at, now)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <IconButton icon={RefreshCw} label={`Run remote light-level test on ${ont?.unit ?? 'ONT'}`} onClick={() => onRetest(r.ontId)} className="size-8!" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {readings.length > DEFAULT_ROWS && (
            <div className="border-t border-border px-5 py-2.5">
              <Button size="xs" variant="ghost" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show fewer' : `Show all ${readings.length} readings`}
              </Button>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 border-t border-border p-5 lg:col-span-2 lg:border-l">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-sm font-semibold text-fg">Rx power distribution</h4>
              <span className="text-xs text-fg-3 tabular">{num(distribution.reporting)} ONTs</span>
            </div>
            <p className="mt-0.5 text-xs text-fg-3">All ONTs with light · 2 dB bins, labeled by center (dBm)</p>
          </div>
          <BarChart data={distribution.bins} height={180} unit="ONTs" formatValue={(v) => num(v)} label="Histogram of ONT receive power in 2 dB bins from −14 to −30 dBm" />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[0] }} />
              Above −27 dBm · pass
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[0], opacity: 0.45 }} />
              At or below −27 dBm · fail (dimmed)
            </span>
          </div>
          <p className="text-xs leading-relaxed text-fg-3">
            The pass threshold is <span className="font-medium text-fg-2">−27 dBm</span>. Bins below it are dimmed:{' '}
            <span className="font-medium text-fg-2">{distribution.below}</span> {distribution.below === 1 ? 'ONT reads' : 'ONTs read'} there and need connector cleaning or
            re-termination. {distribution.noLight} {distribution.noLight === 1 ? 'ONT reports' : 'ONTs report'} no light (LOS or offline) and {distribution.noLight === 1 ? 'is' : 'are'} excluded.
          </p>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { label: 'Median', value: distribution.median },
              { label: 'Strongest', value: distribution.strongest },
              { label: 'Weakest', value: distribution.weakest },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-border">
                <dt className="text-[11px] text-fg-3">{s.label}</dt>
                <dd className="mt-0.5 font-mono text-xs text-fg tabular">{s.value === null ? '—' : `${signed(s.value)} dBm`}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  )
}
