import { Building2, Cable, CalendarClock, ClipboardCheck, Headset, PackageCheck, Radar, RadioTower, Siren, UserRound, type LucideIcon } from 'lucide-react'
import { formatDuration } from '@/lib/format'
import { isOpen, slaState, stageLabel, type SlaState } from '@/lib/workflows'
import type { Priority, WorkOrder, WorkOrderSource, WorkOrderType } from '@/types'

export const WO_TYPE_ICON: Record<WorkOrderType, LucideIcon> = {
  emergency: Siren,
  trouble: Cable,
  support: Headset,
  install: PackageCheck,
  maintenance: ClipboardCheck,
}

export const WO_TYPE_SHORT: Record<WorkOrderType, string> = {
  emergency: 'Emergency',
  trouble: 'Trouble call',
  support: 'Support',
  install: 'Install',
  maintenance: 'Maintenance',
}

export const WO_SOURCE_ICON: Record<WorkOrderSource, LucideIcon> = {
  'ISP Dispatch': RadioTower,
  'Auto-detect': Radar,
  Resident: UserRound,
  Scheduled: CalendarClock,
  'Property Manager': Building2,
}

export const WO_TYPE_ORDER: WorkOrderType[] = ['emergency', 'trouble', 'support', 'install', 'maintenance']

export const SLA_LABEL: Record<SlaState, string> = {
  met: 'SLA met',
  missed: 'SLA missed',
  'on-track': 'On track',
  'at-risk': 'At risk',
  breached: 'Breached',
}

export const DEFAULT_SOURCE: Record<WorkOrderType, WorkOrderSource> = {
  emergency: 'ISP Dispatch',
  trouble: 'ISP Dispatch',
  install: 'Property Manager',
  maintenance: 'Scheduled',
  support: 'Resident',
}

export const DEFAULT_PRIORITY: Record<WorkOrderType, Priority> = {
  emergency: 'P1',
  trouble: 'P2',
  support: 'P2',
  install: 'P3',
  maintenance: 'P3',
}

const PRIORITY_RANK: Record<Priority, number> = { P1: 0, P2: 1, P3: 2 }

export function compareWorkOrders(a: WorkOrder, b: WorkOrder): number {
  const aOpen = isOpen(a)
  const bOpen = isOpen(b)
  if (aOpen !== bOpen) return aOpen ? -1 : 1
  if (aOpen) {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (byPriority !== 0) return byPriority
    return a.dueAt - b.dueAt
  }
  return (b.closedAt ?? 0) - (a.closedAt ?? 0)
}

export function lastEntryFor(wo: WorkOrder, stage: string) {
  for (let i = wo.history.length - 1; i >= 0; i--) {
    if (wo.history[i].stage === stage) return wo.history[i]
  }
  return undefined
}

const PHOTO_PREFIX: Record<string, string> = {
  dispatched: 'Site arrival',
  assigned: 'Site arrival',
  'en-route': 'Site arrival',
  received: 'Reported issue',
  diagnosing: 'As found',
  inspecting: 'As found',
  scheduled: 'Pre-work survey',
  repairing: 'After repair',
  'light-level': 'Light-level reading',
  documenting: 'After repair',
  installing: 'Device installed',
  wifi: 'WiFi coverage survey',
  onboarding: 'App onboarding',
  resolving: 'Resolution',
  closed: 'Closeout',
}

const PHOTO_SUBJECT: Record<WorkOrderType, string> = {
  emergency: 'Splice tray',
  trouble: 'Fiber drop',
  maintenance: 'Cabinet',
  install: 'Smart hub',
  support: 'Device',
}

const PHOTO_GRADIENTS: Array<[string, string]> = [
  ['#0e7490', '#1e293b'],
  ['#155e75', '#312e81'],
  ['#065f46', '#0f172a'],
  ['#7c2d12', '#1f2937'],
  ['#3730a3', '#0f172a'],
  ['#334155', '#0c4a6e'],
]

const FIBER_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a16207', '#94a3b8', '#f8fafc']

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')
}

export function samplePhotoCaption(wo: WorkOrder): string {
  const prefix = PHOTO_PREFIX[wo.stage] ?? 'Site photo'
  return `${prefix} — ${stageLabel(wo)}`
}

export function makeSamplePhoto(wo: WorkOrder, caption: string, locationLabel: string, at: number): string {
  const [c1, c2] = PHOTO_GRADIENTS[wo.photos.length % PHOTO_GRADIENTS.length]
  const subject = PHOTO_SUBJECT[wo.type]
  const offset = (wo.photos.length * 17) % 40
  const fibers = FIBER_COLORS.map((color, i) => {
    const y = 120 + i * 14
    return `<path d='M-10 ${y + offset} C 110 ${y - 50}, 200 ${y + 60}, 250 ${y} S 400 ${y - 40 + offset}, 500 ${y + 10}' stroke='${color}'/>`
  }).join('')
  const stamp = new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='480' height='360' viewBox='0 0 480 360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='480' height='360' fill='url(#g)'/><rect x='130' y='92' width='220' height='128' rx='14' fill='rgba(0,0,0,0.35)' stroke='rgba(255,255,255,0.35)' stroke-width='2'/><g fill='none' stroke-width='4' stroke-linecap='round' opacity='0.9'>${fibers}</g><text x='140' y='112' font-family='Arial,sans-serif' font-size='11' fill='rgba(255,255,255,0.7)' letter-spacing='1'>${escapeXml(subject.toUpperCase())}</text><circle cx='446' cy='30' r='6' fill='#22d3ee'/><text x='432' y='34' text-anchor='end' font-family='Arial,sans-serif' font-size='11' fill='rgba(255,255,255,0.75)'>HavenLink Field</text><rect x='0' y='282' width='480' height='78' fill='rgba(0,0,0,0.6)'/><text x='18' y='312' font-family='Arial,sans-serif' font-size='17' font-weight='bold' fill='#ffffff'>${escapeXml(caption)}</text><text x='18' y='338' font-family='monospace' font-size='12' fill='#a1a1aa'>${escapeXml(`${wo.number} · ${locationLabel} · ${stamp}`)}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function slaText(wo: WorkOrder, now: number): string {
  const state = slaState(wo, now)
  if (state === 'met' || state === 'missed') return SLA_LABEL[state]
  if (state === 'breached') return `${formatDuration(now - wo.dueAt)} over`
  return `${formatDuration(wo.dueAt - now)} left`
}

export function locationLabel(propertyName: string | undefined, unit: string | undefined): string {
  if (propertyName && unit) return `${propertyName} · ${unit}`
  return unit ?? propertyName ?? '—'
}
