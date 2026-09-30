import { Link } from 'react-router'
import { BRAND } from '@/config'
import { cn } from '@/lib/cn'

export function LogoGlyph({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent shadow-xs', className)}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.5 11 12 4.75 19.5 11v7.75a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
        <circle cx="12" cy="13.75" r="2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}

export function BrandMark({ product, className }: { product?: string; className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)}>
      <LogoGlyph />
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-[-0.01em] text-fg">{BRAND.name}</span>
        {product && <span className="block text-xs text-fg-3">{product}</span>}
      </span>
    </Link>
  )
}
