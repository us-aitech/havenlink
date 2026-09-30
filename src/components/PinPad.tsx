import { useState } from 'react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'

export function PinPad({ onSuccess, compact }: { onSuccess?: () => void; compact?: boolean }) {
  const disarm = useStore((s) => s.disarmSecurity)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  function press(digit: string) {
    if (pin.length >= 4) return
    const next = pin + digit
    setError(false)
    setPin(next)
    if (next.length === 4) {
      const ok = disarm(next)
      if (ok) {
        setPin('')
        onSuccess?.()
      } else {
        setError(true)
        setTimeout(() => setPin(''), 500)
      }
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn('flex gap-3', error && 'animate-[siren_0.3s_2]')}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('size-3.5 rounded-full ring-1 transition', i < pin.length ? (error ? 'bg-critical ring-critical' : 'bg-accent ring-accent') : 'ring-border-strong')} />
        ))}
      </div>
      <div className={cn('grid grid-cols-3', compact ? 'gap-2' : 'gap-3')}>
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
              className={cn(
                'flex items-center justify-center rounded-full bg-surface-2 font-medium text-fg ring-1 ring-inset ring-border transition hover:bg-surface-3 active:scale-95',
                compact ? 'size-12 text-lg' : 'size-16 text-xl',
              )}
            >
              {k === 'del' ? <Delete className="size-5 text-fg-3" /> : k}
            </button>
          ),
        )}
      </div>
      <p className={cn('text-xs', error ? 'text-critical-fg' : 'text-fg-3')}>{error ? 'Wrong PIN — try again' : 'Demo PIN: 1234'}</p>
    </div>
  )
}
