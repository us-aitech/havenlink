import type { ReactNode } from 'react'

export function ChartTooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width - 170
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
      style={{ left: flip ? undefined : x + 12, right: flip ? width - x + 12 : undefined, top: Math.max(0, y - 12) }}
    >
      {children}
    </div>
  )
}
