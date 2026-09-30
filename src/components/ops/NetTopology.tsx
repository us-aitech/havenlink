import { useMemo } from 'react'
import { House, Server, Split } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { dbm } from '@/lib/format'
import { ONT_STATUS_LABEL } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { Ont, OntStatus, Splitter } from '@/types'
import { ONT_STATUSES, ONT_STATUS_ICON, ONT_TILE_CLASS, shortUnit } from './NetUtils'

interface OntView {
  ont: Ont
  status: OntStatus
  rx: number | null
}

function OntTile({ view, selected, onSelect }: { view: OntView; selected: boolean; onSelect: (id: string) => void }) {
  const { ont, status, rx } = view
  const Icon = ONT_STATUS_ICON[status]
  const label = `${ont.unit} · ${ONT_STATUS_LABEL[status]} · ${dbm(rx)}${ont.smartHome ? ' · Smart home' : ''}${ont.isDemoHome ? ' · Demo home' : ''}`
  return (
    <button
      type="button"
      onClick={() => onSelect(ont.id)}
      title={label}
      aria-label={label}
      className={cn(
        'relative flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md font-mono text-[10px] leading-none ring-1 transition ring-inset',
        ONT_TILE_CLASS[status],
        status === 'los' && 'animate-pulse',
        ont.isDemoHome && 'ring-2 ring-accent',
        selected && 'outline-2 outline-offset-2 outline-white/80',
      )}
    >
      <span className="max-w-full truncate px-1">{shortUnit(ont.unit)}</span>
      <Icon className={cn('size-2.5', status === 'online' && 'opacity-50')} />
      {ont.smartHome && !ont.isDemoHome && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" />}
      {ont.isDemoHome && <House className="absolute top-0.5 right-0.5 size-2.5 text-accent-fg" />}
    </button>
  )
}

function SecondaryCard({ splitter, views, selectedOntId, onSelectOnt }: { splitter: Splitter; views: OntView[]; selectedOntId: string | null; onSelectOnt: (id: string) => void }) {
  const online = views.filter((v) => v.status === 'online').length
  const allLos = views.length > 0 && views.every((v) => v.status === 'los')
  const hasDemo = views.some((v) => v.ont.isDemoHome)
  const alarms = views.length - online
  const spare = Math.max(0, 8 - views.length)
  return (
    <div className={cn('rounded-xl border p-3 transition', allLos ? 'border-critical-line bg-critical-soft' : hasDemo ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface-2')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-xs font-semibold whitespace-nowrap text-fg">{splitter.name}</span>
          <span className="rounded bg-surface-2 px-1 text-[10px] text-fg-3">{splitter.ratio}</span>
        </div>
        {allLos ? (
          <Badge tone="critical" icon={ONT_STATUS_ICON.los}>
            LOS
          </Badge>
        ) : (
          <span className={cn('shrink-0 text-[11px] tabular', alarms ? 'text-warning-fg' : 'text-fg-3')}>
            {online}/{views.length} online
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-fg-3">
          {splitter.cabinet} · {splitter.lossDb} dB
        </span>
        {hasDemo && (
          <Badge tone="accent" icon={House}>
            Demo home
          </Badge>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {views.map((v) => (
          <OntTile key={v.ont.id} view={v} selected={v.ont.id === selectedOntId} onSelect={onSelectOnt} />
        ))}
        {Array.from({ length: spare }, (_, i) => (
          <div key={`spare-${i}`} title="Spare port" className="flex h-10 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-fg-4">
            spare
          </div>
        ))}
      </div>
    </div>
  )
}

export function NetTopologyLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-fg-3', className)}>
      {ONT_STATUSES.map((s) => {
        const Icon = ONT_STATUS_ICON[s]
        return (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn('inline-flex size-4 items-center justify-center rounded ring-1 ring-inset', ONT_TILE_CLASS[s])}>
              <Icon className="size-2.5" />
            </span>
            {ONT_STATUS_LABEL[s]}
          </span>
        )
      })}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-accent" />
        Smart-home unit
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex size-4 items-center justify-center rounded ring-2 ring-accent">
          <House className="size-2.5 text-accent-fg" />
        </span>
        Demo home
      </span>
    </div>
  )
}

export function NetTopology({ propertyId, selectedOntId, onSelectOnt }: { propertyId: string; selectedOntId: string | null; onSelectOnt: (id: string) => void }) {
  const splitters = useStore((s) => s.ops.splitters)
  const onts = useStore((s) => s.ops.onts)
  const olts = useStore((s) => s.ops.olts)
  const properties = useStore((s) => s.ops.properties)
  const homeNetwork = useStore((s) => s.home.network)

  const tree = useMemo(() => {
    const views = new Map<string, OntView[]>()
    for (const o of onts) {
      if (o.propertyId !== propertyId) continue
      const view: OntView = { ont: o, status: o.isDemoHome ? homeNetwork.status : o.status, rx: o.isDemoHome ? homeNetwork.rxPowerDbm : o.rxPowerDbm }
      const list = views.get(o.splitterId)
      if (list) list.push(view)
      else views.set(o.splitterId, [view])
    }
    const local = splitters.filter((s) => s.propertyId === propertyId)
    return local
      .filter((s) => s.parentId === null)
      .map((primary) => {
        const children = local.filter((s) => s.parentId === primary.id).map((s) => ({ splitter: s, views: views.get(s.id) ?? [] }))
        const all = children.flatMap((c) => c.views)
        return { primary, children, total: all.length, online: all.filter((v) => v.status === 'online').length }
      })
  }, [splitters, onts, propertyId, homeNetwork.status, homeNetwork.rxPowerDbm])

  const property = properties.find((p) => p.id === propertyId)
  const olt = olts.find((o) => o.id === property?.oltId)
  const portNumber = (olts.findIndex((o) => o.id === olt?.id) * 5 + properties.findIndex((p) => p.id === propertyId)) % (olt?.ponPorts ?? 16) + 1

  return (
    <div className="min-w-0">
      <div className="inline-flex max-w-full items-center gap-3 rounded-xl border border-accent-line bg-accent-soft px-3 py-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft ring-1 ring-accent-line ring-inset">
          <Server className="size-4 text-accent-fg" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono text-sm font-semibold text-fg">{olt?.name ?? 'OLT'}</span>
            <span className="text-[11px] text-accent-fg">PON {portNumber}</span>
          </div>
          <div className="truncate text-[11px] text-fg-3">{olt?.location} · GPON 2.5G / 1.25G</div>
        </div>
      </div>
      <div className="ml-[31px]">
        {tree.map((branch, i) => {
          const isLast = i === tree.length - 1
          const alarms = branch.total - branch.online
          return (
            <div key={branch.primary.id} className="relative pt-4 pl-5 sm:pl-7">
              <span className={cn('absolute top-0 left-0 w-px bg-line-strong', isLast ? 'h-[34px]' : 'h-full')} />
              <span className="absolute top-[34px] left-0 h-px w-5 bg-line-strong sm:w-7" />
              <div className="flex h-9 min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-2 ring-1 ring-border ring-inset">
                  <Split className="size-3.5 rotate-90" />
                </span>
                <span className="font-mono text-sm font-semibold text-fg">{branch.primary.name}</span>
                <span className="rounded bg-surface-2 px-1 text-[10px] text-fg-3">{branch.primary.ratio}</span>
                <span className="hidden truncate text-xs text-fg-3 sm:inline">
                  {branch.primary.cabinet} · {branch.primary.lossDb} dB loss
                </span>
                <span className={cn('ml-auto shrink-0 text-xs tabular', alarms ? 'text-warning-fg' : 'text-fg-3')}>
                  {branch.online}/{branch.total} online
                </span>
              </div>
              <div className="mt-2 ml-3.5 grid grid-cols-1 gap-3 border-l border-dashed border-border-strong pt-1 pb-2 pl-3 sm:grid-cols-2 sm:pl-4 xl:grid-cols-4">
                {branch.children.map((c) => (
                  <SecondaryCard key={c.splitter.id} splitter={c.splitter} views={c.views} selectedOntId={selectedOntId} onSelectOnt={onSelectOnt} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
