const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function timeAgo(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return '—'
  const diff = now - ts
  if (diff < 10_000 && diff > -10_000) return 'just now'
  if (diff < 0) return `in ${formatDuration(-diff)}`
  if (diff < MINUTE) return `${Math.floor(diff / 1000)}s ago`
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  return `${Math.floor(diff / DAY)}d ago`
}

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  if (abs < MINUTE) return `${Math.max(0, Math.round(abs / 1000))}s`
  if (abs < HOUR) return `${Math.floor(abs / MINUTE)}m`
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR)
    const m = Math.floor((abs % HOUR) / MINUTE)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  const d = Math.floor(abs / DAY)
  const h = Math.floor((abs % DAY) / HOUR)
  return h ? `${d}d ${h}h` : `${d}d`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatWeekday(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function currency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(value >= 100_000 ? 0 : 1)}k`
  }
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function num(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function dbm(value: number | null): string {
  return value === null ? 'No light' : `${value.toFixed(1)} dBm`
}

export function greeting(ts = Date.now()): string {
  const hour = new Date(ts).getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
