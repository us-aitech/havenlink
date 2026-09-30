export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'] as const

export const STATUS = {
  good: 'var(--good)',
  warning: 'var(--warning)',
  serious: 'var(--serious)',
  critical: 'var(--critical)',
} as const

export const CHART_INK = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  label: 'var(--chart-label)',
  strong: 'var(--fg-2)',
  surface: 'var(--surface)',
  crosshair: 'var(--border-strong)',
}
