import { PowerOff, SignalLow, Unplug, Wifi, type LucideIcon } from 'lucide-react'
import { locateFiberFaults } from '@/lib/fiber'
import type { Ont, OntStatus, Splitter } from '@/types'

export const RX_THRESHOLD = -27
export const RX_STRONG = -8
export const RX_WEAK = -30

export const ONT_STATUSES: OntStatus[] = ['online', 'degraded', 'los', 'offline']

export const ONT_STATUS_ICON: Record<OntStatus, LucideIcon> = {
  online: Wifi,
  degraded: SignalLow,
  los: Unplug,
  offline: PowerOff,
}

export const ONT_ALARM_RANK: Record<OntStatus, number> = {
  los: 0,
  degraded: 1,
  offline: 2,
  online: 3,
}

export const ONT_CELL_CLASS: Record<OntStatus, string> = {
  online: 'bg-good',
  degraded: 'bg-warning',
  los: 'bg-critical',
  offline: 'bg-neutral',
}

export const ONT_ISSUE: Record<OntStatus, string> = {
  online: 'Resident-reported service issue',
  degraded: 'Low light level',
  los: 'Loss of signal (LOS)',
  offline: 'ONT offline',
}

export function shortUnit(unit: string): string {
  if (unit.startsWith('#')) return unit
  if (unit.startsWith('Suite ')) return `S${unit.slice(6)}`
  const first = unit.split(' ')[0]
  return /^\d+$/.test(first) ? first : unit.slice(0, 5)
}

export function rxPass(value: number | null): boolean {
  return value !== null && value > RX_THRESHOLD
}

export interface CutDetection {
  splitter: Splitter
  ontCount: number
}

/** Shared-fiber outages (feeder or splitter level), from the same rules as the Fiber signal panel. */
export function detectFiberCuts(splitters: Splitter[], onts: Ont[]): CutDetection[] {
  return locateFiberFaults(splitters, onts)
    .filter((f) => f.level === 'feeder' || f.level === 'splitter')
    .map((f) => ({ splitter: f.splitter, ontCount: f.onts.length }))
}
