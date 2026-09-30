import { useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function PinPad({ onSuccess, compact }: { onSuccess?: () => void; compact?: boolean }) {
  const disarm = useStore((s) => s.disarmSecurity)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const dotsRef = useRef<HTMLDivElement>(null)

  function shake() {
    dotsRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 360, easing: 'ease-in-out' },
    )
  }

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
        shake()
        setTimeout(() => setPin(''), 500)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div ref={dotsRef} className="flex gap-3.5" role="status" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('size-3 rounded-full transition-colors', i < pin.length ? (error ? 'bg-critical' : 'bg-accent') : 'bg-surface ring-1 ring-border-strong ring-inset')} />
        ))}
      </div>
      <div className={cn('grid grid-cols-3', compact ? 'gap-2.5' : 'gap-3')}>
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              aria-label={k === 'del' ? 'Delete digit' : k}
              onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
              className={cn(
                'flex items-center justify-center rounded-full font-medium tabular transition-[background-color,transform] active:scale-95',
                k === 'del' ? 'text-fg-3 hover:bg-surface-3 hover:text-fg' : 'bg-surface-2 text-fg ring-1 ring-border ring-inset hover:bg-surface-3',
                compact ? 'size-12 text-lg' : 'size-14 text-xl',
              )}
            >
              {k === 'del' ? <Delete className="size-5" /> : k}
            </button>
          ),
        )}
      </div>
      <p className={cn('text-xs', error ? 'text-critical-fg' : 'text-fg-3')} aria-live="polite">
        {error ? 'Incorrect PIN. Try again.' : 'Demo PIN: 1234'}
      </p>
    </div>
  )
}
