import type { PartnerId } from '@/types'

export const BRAND = {
  name: 'HavenLink',
  residentProduct: 'HavenLink Home',
  opsProduct: 'HavenLink Ops',
  tagline: 'Fiber, maintenance and smart-home — one vendor, one platform.',
  operator: 'Field Services Partner',
  region: 'Southwest Florida',
}

export interface Partner {
  id: PartnerId
  name: string
  short: string
  planName: string
  down: number
  up: number
  accent: string
}

export const PARTNERS: Partner[] = [
  { id: 'hotwire', name: 'Hotwire Communications', short: 'Hotwire', planName: 'Fiber 1 Gig', down: 1000, up: 1000, accent: '#f97316' },
  { id: 'att', name: 'AT&T Fiber', short: 'AT&T', planName: 'Fiber 1 Gig', down: 1000, up: 1000, accent: '#38bdf8' },
  { id: 'frontier', name: 'Frontier Fiber', short: 'Frontier', planName: 'Fiber 1 Gig', down: 1000, up: 1000, accent: '#ef4444' },
  { id: 'summit', name: 'Summit Broadband', short: 'Summit', planName: 'Gigabit Fiber', down: 1000, up: 500, accent: '#22c55e' },
  { id: 'comcast', name: 'Comcast Xfinity', short: 'Xfinity', planName: 'Gigabit Pro', down: 1200, up: 1200, accent: '#a855f7' },
]

export function getPartner(id: PartnerId): Partner {
  return PARTNERS.find((p) => p.id === id) ?? PARTNERS[0]
}

export const DEMO = {
  tickMs: 1000,
  simMinutesPerSecond: 1,
  exitDelaySeconds: 10,
  entryDelaySeconds: 15,
  highFlowSecondsToTrigger: 3,
  valveTravelSeconds: 3,
  garageTravelSeconds: 4,
  speedTestSeconds: 5,
}
