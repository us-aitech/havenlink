import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { Building2, Check, ChevronRight, ChevronsUpDown, Home, LayoutTemplate, Moon, Sun, type LucideIcon } from 'lucide-react'
import { BRAND } from '@/config'
import { cn } from '@/lib/cn'
import { usePartner } from '@/lib/hooks'
import { useTheme } from '@/lib/theme'
import { Avatar, IconButton } from '../ui'
import { LogoGlyph } from './Brand'

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme()
  return (
    <IconButton
      icon={theme === 'dark' ? Sun : Moon}
      label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={className}
    />
  )
}

const WORKSPACES = [
  { key: 'home', to: '/home', label: BRAND.residentProduct, hint: 'Resident app', icon: Home },
  { key: 'ops', to: '/ops', label: BRAND.opsProduct, hint: 'Operations console', icon: Building2 },
] as const

export function WorkspaceSwitcher() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = pathname.startsWith('/ops') ? WORKSPACES[1] : WORKSPACES[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-3"
      >
        <LogoGlyph />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-fg">{BRAND.name}</span>
          <span className="block truncate text-xs text-fg-3">{current.hint}</span>
        </span>
        <ChevronsUpDown className="size-4 text-fg-4" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 left-0 z-50 mt-1 animate-slide-up rounded-xl border border-border bg-surface p-1 shadow-lg">
          <div className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-fg-4">Switch workspace</div>
          {WORKSPACES.map((w) => (
            <button
              key={w.key}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                navigate(w.to)
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-3"
            >
              <span className="flex size-7 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-2">
                <w.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-fg">{w.hint}</span>
                <span className="block text-xs text-fg-3">{w.label}</span>
              </span>
              {w.key === current.key && <Check className="size-4 text-accent-fg" />}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/')
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] text-fg-2 hover:bg-surface-3"
          >
            <LayoutTemplate className="size-4 text-fg-3" />
            Proposal overview
          </button>
        </div>
      )}
    </div>
  )
}

export interface SideNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: number
  alert?: string
}

export function SideNavSection({ title, items, onNavigate }: { title?: string; items: SideNavItem[]; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-px">
      {title && <div className="px-2.5 pt-4 pb-1.5 text-[11px] font-medium text-fg-4">{title}</div>}
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn('group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors', isActive ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-3/60 hover:text-fg')
          }
        >
          {({ isActive }) => (
            <>
              <n.icon className={cn('size-4', isActive ? 'text-fg' : 'text-fg-3 group-hover:text-fg-2')} />
              <span className="flex-1 truncate">{n.label}</span>
              {n.alert && <span className="rounded bg-critical px-1 text-[10px] leading-4 font-semibold text-white tabular">{n.alert}</span>}
              {n.count !== undefined && n.count > 0 && <span className="text-xs text-fg-3 tabular">{n.count}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export function PartnerCard() {
  const partner = usePartner()
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="text-[11px] font-medium text-fg-4">Network partner</div>
      <div className="mt-0.5 flex items-center gap-2 text-[13px] font-medium text-fg">
        <span className="size-2 rounded-full" style={{ background: partner.accent }} />
        <span className="truncate">{partner.name}</span>
      </div>
    </div>
  )
}

export function UserRow({ initials, name, role }: { initials: string; name: string; role: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <Avatar initials={initials} size="md" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-medium text-fg">{name}</div>
        <div className="truncate text-xs text-fg-3">{role}</div>
      </div>
      <ThemeToggle />
    </div>
  )
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      {items.map((item, i) => (
        <span key={item.label} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-fg-4" />}
          {item.to && i < items.length - 1 ? (
            <Link to={item.to} className="truncate text-fg-3 hover:text-fg">
              {item.label}
            </Link>
          ) : (
            <span className={cn('truncate', i === items.length - 1 ? 'font-medium text-fg' : 'text-fg-3')}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function Sidebar({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="px-3 pt-3">
        <WorkspaceSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">{children}</nav>
      <div className="flex flex-col gap-3 border-t border-border p-3">{footer}</div>
    </aside>
  )
}
