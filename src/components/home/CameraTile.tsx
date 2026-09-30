import { Circle, VideoOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatClock, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import type { Camera } from '@/types'

const SCENES: Record<string, { sky: string; ground: string; shape: 'door' | 'driveway' | 'pool' | 'room' }> = {
  'c-doorbell': { sky: 'from-sky-900/60 via-slate-800 to-slate-900', ground: '#1e293b', shape: 'door' },
  'c-driveway': { sky: 'from-indigo-900/50 via-slate-800 to-zinc-900', ground: '#27272a', shape: 'driveway' },
  'c-backyard': { sky: 'from-cyan-900/50 via-slate-800 to-slate-900', ground: '#0f2a2e', shape: 'pool' },
  'c-living': { sky: 'from-amber-900/30 via-stone-800 to-zinc-900', ground: '#292524', shape: 'room' },
}

function SceneArt({ shape, ground }: { shape: string; ground: string }) {
  return (
    <svg viewBox="0 0 160 90" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
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
  return (
    <div className={cn('group relative aspect-video overflow-hidden rounded-xl border border-line bg-gradient-to-b', scene.sky, alarm && 'border-rose-500/60', className)}>
      {camera.online ? (
        <>
          <SceneArt shape={scene.shape} ground={scene.ground} />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_3px)]" />
          {recentMotion && <div className="absolute top-1/3 left-1/2 h-1/2 w-1/5 -translate-x-1/2 rounded border-2 border-amber-300/80" />}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur">
              <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />
              LIVE
            </span>
            {camera.recording && (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-200 backdrop-blur">
                <Circle className="size-2 fill-rose-500 text-rose-500" />
                REC
              </span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
            <div>
              <div className="text-xs font-medium text-white">{camera.name}</div>
              <div className="text-[10px] text-zinc-300">{recentMotion ? 'Motion detected' : `Motion ${timeAgo(camera.lastMotionAt, now)}`}</div>
            </div>
            <span className="font-mono text-[10px] text-zinc-300">{formatClock(now)}</span>
          </div>
        </>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-zinc-500">
          <VideoOff className="size-5" />
          <span className="text-xs">{camera.name} offline</span>
        </div>
      )}
    </div>
  )
}
