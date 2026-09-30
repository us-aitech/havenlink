import { VideoOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatClock, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import type { Camera } from '@/types'

type Shape = 'door' | 'driveway' | 'pool' | 'room'

const SCENES: Record<string, { sky: string; ground: string; shape: Shape }> = {
  'c-doorbell': { sky: 'linear-gradient(180deg, #16324a 0%, #1f2937 55%, #111827 100%)', ground: '#1e293b', shape: 'door' },
  'c-driveway': { sky: 'linear-gradient(180deg, #232150 0%, #1f2937 55%, #18181b 100%)', ground: '#27272a', shape: 'driveway' },
  'c-backyard': { sky: 'linear-gradient(180deg, #123a44 0%, #1f2937 55%, #111827 100%)', ground: '#0f2a2e', shape: 'pool' },
  'c-living': { sky: 'linear-gradient(180deg, #3a2a1a 0%, #292524 55%, #18181b 100%)', ground: '#292524', shape: 'room' },
}

const SCANLINES = 'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.025) 0px, rgb(255 255 255 / 0.025) 1px, transparent 1px, transparent 3px)'
const CHIP = { background: 'rgb(0 0 0 / 0.45)' }
const FOOTER_SHADE = { background: 'linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0))' }

function SceneArt({ shape, ground }: { shape: Shape; ground: string }) {
  return (
    <svg viewBox="0 0 160 90" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x="0" y="58" width="160" height="32" fill={ground} />
      {shape === 'door' && (
        <g opacity="0.8">
          <rect x="56" y="18" width="48" height="52" rx="2" fill="#334155" />
          <rect x="66" y="26" width="28" height="44" rx="1" fill="#1e293b" />
          <circle cx="90" cy="50" r="1.6" fill="#fbbf24" />
          <rect x="20" y="40" width="18" height="20" rx="3" fill="#14532d" opacity="0.7" />
          <rect x="122" y="40" width="18" height="20" rx="3" fill="#14532d" opacity="0.7" />
          <path d="M40 90 L66 70 L94 70 L120 90Z" fill="#475569" opacity="0.6" />
        </g>
      )}
      {shape === 'driveway' && (
        <g opacity="0.8">
          <path d="M50 90 L72 52 L96 52 L130 90Z" fill="#3f3f46" />
          <rect x="74" y="44" width="22" height="10" rx="3" fill="#64748b" />
          <rect x="10" y="30" width="44" height="30" fill="#334155" />
          <path d="M6 32 L32 16 L58 32Z" fill="#1e293b" />
          <circle cx="140" cy="44" r="12" fill="#14532d" opacity="0.8" />
          <rect x="138" y="54" width="4" height="8" fill="#422006" />
        </g>
      )}
      {shape === 'pool' && (
        <g opacity="0.85">
          <rect x="30" y="60" width="100" height="22" rx="4" fill="#0e7490" opacity="0.7" />
          <path d="M34 68 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0" stroke="#67e8f9" strokeWidth="1" fill="none" opacity="0.5" />
          <rect x="0" y="20" width="160" height="2" fill="#475569" />
          <rect x="10" y="22" width="2" height="36" fill="#475569" />
          <rect x="148" y="22" width="2" height="36" fill="#475569" />
          <circle cx="24" cy="46" r="10" fill="#14532d" opacity="0.8" />
        </g>
      )}
      {shape === 'room' && (
        <g opacity="0.85">
          <rect x="30" y="46" width="70" height="20" rx="4" fill="#57534e" />
          <rect x="30" y="38" width="70" height="12" rx="4" fill="#78716c" />
          <rect x="112" y="24" width="30" height="20" rx="1" fill="#1c1917" stroke="#44403c" />
          <rect x="120" y="60" width="16" height="6" rx="1" fill="#44403c" />
          <circle cx="16" cy="30" r="5" fill="#fbbf24" opacity="0.4" />
          <rect x="15" y="34" width="2" height="30" fill="#57534e" />
        </g>
      )}
    </svg>
  )
}

export function CameraTile({ camera, className, alarm }: { camera: Camera; className?: string; alarm?: boolean }) {
  const now = useNow(1000)
  const scene = SCENES[camera.id] ?? SCENES['c-living']
  const recentMotion = camera.lastMotionAt !== null && now - camera.lastMotionAt < 20_000

  if (!camera.online) {
    return (
      <div className={cn('flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 text-fg-3', className)}>
        <VideoOff className="size-5" />
        <span className="text-xs">{camera.name} is offline</span>
      </div>
    )
  }

  return (
    <div
      className={cn('relative isolate aspect-video overflow-hidden rounded-lg border', alarm ? 'border-critical ring-1 ring-critical-line' : 'border-border', className)}
      style={{ background: scene.sky }}
      role="img"
      aria-label={`${camera.name} camera, live${camera.recording ? ', recording' : ''}${recentMotion ? ', motion detected' : ''}`}
    >
      <SceneArt shape={scene.shape} ground={scene.ground} />
      <div className="absolute inset-0" style={{ background: SCANLINES }} />
      {recentMotion && <div className="absolute top-1/3 left-1/2 h-1/2 w-1/5 -translate-x-1/2 rounded-sm border-2 border-warning" />}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
        <span className="inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium text-white backdrop-blur-sm" style={CHIP}>
          <span className="size-1.5 animate-pulse rounded-full bg-critical" />
          Live
        </span>
        {camera.recording && (
          <span className="inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium text-white backdrop-blur-sm" style={CHIP}>
            <span className="size-1.5 rounded-full bg-critical" />
            Rec
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-2.5 pt-8 pb-2" style={FOOTER_SHADE}>
        <div className="min-w-0">
          <div className="truncate text-[13px] leading-5 font-medium text-white">{camera.name}</div>
          <div className="truncate text-[11px] leading-4 text-white opacity-75">{recentMotion ? 'Motion detected' : `Motion ${timeAgo(camera.lastMotionAt, now)}`}</div>
        </div>
        <span className="shrink-0 text-[11px] leading-4 text-white opacity-75 tabular">{formatClock(now)}</span>
      </div>
    </div>
  )
}
