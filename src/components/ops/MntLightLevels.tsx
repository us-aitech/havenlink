import { useMemo, useState } from 'react'
import { Gauge, RefreshCw } from 'lucide-react'
import { SERIES, STATUS } from '@/components/charts/palette'
import { Badge, Button, Card, CardHeader, EmptyState, IconButton } from '@/components/ui'
import { num, pct, timeAgo } from '@/lib/format'
import type { LightLevelReading, Ont, Property } from '@/types'
import { signedDbm } from './MntShared'
import { MntRxHistogram, type RxBin } from './MntRxHistogram'

const THRESHOLD_DBM = -27
const BIN_CENTERS = [-14, -16, -18, -20, -22, -24, -26, -28, -30]
const DEFAULT_ROWS = 8

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
  const failCount = readings.length - passCount
  const threshold = signedDbm(THRESHOLD_DBM, 0)

  const distribution = useMemo(() => {
    const bins: RxBin[] = BIN_CENTERS.map((center) => ({ center, count: 0, fail: center < THRESHOLD_DBM }))
    const values: number[] = []
    for (const o of onts) {
      if (o.rxPowerDbm === null) continue
      values.push(o.rxPowerDbm)
      bins[binIndex(o.rxPowerDbm)].count += 1
    }
    values.sort((a, b) => a - b)
    return {
      bins,
      reporting: values.length,
      noLight: onts.length - values.length,
      below: values.filter((v) => v <= THRESHOLD_DBM).length,
      median: values.length ? values[Math.floor(values.length / 2)] : null,
      strongest: values.length ? values[values.length - 1] : null,
      weakest: values.length ? values[0] : null,
    }
  }, [onts])

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader
          title="Light-level testing"
          subtitle={`ONT receive power at ONT and splitter test points · readings at or below ${threshold} dBm fail`}
          action={
            readings.length ? (
              <Badge tone={failCount === 0 ? 'good' : 'warning'} dot>
                {pct(passCount / readings.length)} pass
              </Badge>
            ) : null
          }
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5">
            <h4 className="text-[13px] font-medium text-fg">Recent readings</h4>
            <span className="text-xs text-fg-3 tabular">
              {passCount} pass · {failCount} fail
            </span>
          </div>
          {readings.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState icon={Gauge} title="No readings yet" message="Remote polls and field tests will appear here." />
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
                    <th className="px-5 py-2 font-medium">ONT</th>
                    <th className="px-3 py-2 font-medium">Point</th>
                    <th className="px-3 py-2 text-right font-medium">Rx power</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="px-3 py-2 font-medium">Tested by</th>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="w-12 py-2 pr-3 pl-1">
                      <span className="sr-only">Retest</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((r) => {
                    const ont = ontById.get(r.ontId)
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-5 py-2">
                          <div className="truncate leading-5 font-medium text-fg">{ont?.unit ?? r.ontId}</div>
                          <div className="truncate text-xs text-fg-3">{ont ? propertyName.get(ont.propertyId) : '—'}</div>
                        </td>
                        <td className="px-3 py-2 text-fg-2">{r.point}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap text-fg tabular">{r.dbm <= -40 ? 'No light' : `${signedDbm(r.dbm)} dBm`}</td>
                        <td className="px-3 py-2">
                          <Badge tone={r.pass ? 'good' : 'critical'} dot>
                            {r.pass ? 'Pass' : 'Fail'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-fg-2">{r.by}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-fg-3 tabular">{timeAgo(r.at, now)}</td>
                        <td className="py-1.5 pr-3 pl-1 text-right">
                          <IconButton icon={RefreshCw} label={`Retest ${ont?.unit ?? 'ONT'}`} onClick={() => onRetest(r.ontId)} className="size-7" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {readings.length > DEFAULT_ROWS && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2">
              <span className="text-xs text-fg-3 tabular">
                Showing {visible.length} of {readings.length}
              </span>
              <Button size="xs" variant="ghost" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show fewer' : `Show all ${readings.length}`}
              </Button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 border-t border-border p-5 lg:col-span-2 lg:border-l">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h4 className="text-[13px] font-medium text-fg">Rx power distribution</h4>
              <p className="mt-0.5 text-xs text-fg-3">ONTs by receive power, 2 dB bins (dBm)</p>
            </div>
            <span className="shrink-0 text-xs text-fg-3 tabular">{num(distribution.reporting)} ONTs</span>
          </div>
          <MntRxHistogram bins={distribution.bins} threshold={THRESHOLD_DBM} />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[0] }} />
              Pass · above {threshold} dBm
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: STATUS.critical }} />
              Fail · {threshold} dBm or weaker
            </span>
          </div>
          <p className="text-[13px] leading-5 text-fg-2">
            {distribution.below === 0 ? (
              <>Every reporting ONT is above the {threshold} dBm threshold.</>
            ) : (
              <>
                <span className="font-medium text-fg">
                  {distribution.below} {distribution.below === 1 ? 'ONT is' : 'ONTs are'}
                </span>{' '}
                at or below {threshold} dBm and need connector cleaning or re-termination.
              </>
            )}{' '}
            <span className="text-fg-3">
              {distribution.noLight} {distribution.noLight === 1 ? 'ONT reports' : 'ONTs report'} no light (LOS or offline) and {distribution.noLight === 1 ? 'is' : 'are'} not shown.
            </span>
          </p>
          <dl className="grid grid-cols-3 gap-4 border-t border-border pt-4">
            {[
              { label: 'Median', value: distribution.median },
              { label: 'Strongest', value: distribution.strongest },
              { label: 'Weakest', value: distribution.weakest },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="text-xs text-fg-3">{s.label}</dt>
                <dd className="mt-0.5 font-mono text-[13px] text-fg tabular">{s.value === null ? '—' : `${signedDbm(s.value)} dBm`}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  )
}
