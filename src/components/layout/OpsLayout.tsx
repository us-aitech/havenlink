import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { ArrowRight, BarChart3, Building2, ClipboardList, LayoutDashboard, Menu, Network, PackageCheck, Wrench, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatClock } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import { SimulatorPanel } from '../SimulatorPanel'
import { Breadcrumb, PartnerCard, SideNavSection, Sidebar, ThemeToggle, UserRow, WorkspaceSwitcher, type SideNavItem } from './Shell'

const TITLES: Record<string, string> = {
  '/ops': 'Overview',
  '/ops/network': 'GPON network',
  '/ops/work-orders': 'Work orders',
  '/ops/maintenance': 'Maintenance',
  '/ops/installs': 'Smart-home installs',
  '/ops/properties': 'Properties',
  '/ops/revenue': 'Revenue',
}

function useNavSections() {
  const workOrders = useStore((s) => s.ops.workOrders)
  const open = workOrders.filter(isOpen)
  const p1 = open.filter((w) => w.priority === 'P1').length
  const monitor: SideNavItem[] = [
    { to: '/ops', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/ops/network', label: 'GPON network', icon: Network },
  ]
  const field: SideNavItem[] = [
    { to: '/ops/work-orders', label: 'Work orders', icon: ClipboardList, count: open.filter((w) => w.type === 'trouble' || w.type === 'emergency' || w.type === 'support').length, alert: p1 ? `P1 · ${p1}` : undefined },
    { to: '/ops/maintenance', label: 'Maintenance', icon: Wrench, count: open.filter((w) => w.type === 'maintenance').length },
    { to: '/ops/installs', label: 'Smart-home installs', icon: PackageCheck, count: open.filter((w) => w.type === 'install').length },
  ]
  const business: SideNavItem[] = [
    { to: '/ops/properties', label: 'Properties', icon: Building2 },
    { to: '/ops/revenue', label: 'Revenue', icon: BarChart3 },
  ]
  return { monitor, field, business }
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { monitor, field, business } = useNavSections()
  return (
    <>
      <SideNavSection title="Monitoring" items={monitor} onNavigate={onNavigate} />
      <SideNavSection title="Field operations" items={field} onNavigate={onNavigate} />
      <SideNavSection title="Business" items={business} onNavigate={onNavigate} />
    </>
  )
}

function SidebarFooter() {
  return (
    <>
      <PartnerCard />
      <UserRow initials="MA" name="Maria Alvarez" role="Dispatch lead" />
    </>
  )
}

function IncidentBanner() {
  const workOrders = useStore((s) => s.ops.workOrders)
  const incidents = workOrders.filter((w) => isOpen(w) && w.priority === 'P1')
  const now = useNow(1000)
  if (!incidents.length) return null
  const wo = incidents[0]
  const remaining = Math.max(0, wo.dueAt - now)
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1000)
  return (
    <Link to={`/ops/work-orders?id=${wo.id}`} className="group flex items-center gap-3 border-b border-critical-line bg-critical-soft px-4 py-2 text-[13px] text-critical-fg sm:px-6">
      <span className="rounded bg-critical px-1.5 text-[11px] leading-5 font-semibold text-white">P1</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{wo.number}</span>
        <span className="mx-1.5 opacity-50">·</span>
        {wo.title}
      </span>
      <span className="hidden shrink-0 font-mono text-xs sm:inline">
        SLA {h}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium">
        View incident <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

export function OpsLayout() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const now = useNow(1000)
  const partner = usePartner()
  const techs = useStore((s) => s.ops.technicians)
  const onDuty = techs.filter((t) => t.status !== 'off-duty').length
  const title = TITLES[pathname] ?? 'Operations'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen">
      <Sidebar footer={<SidebarFooter />}>
        <NavContent />
      </Sidebar>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-overlay" onClick={() => setMenuOpen(false)} />
          <aside className="relative flex h-full w-72 animate-slide-in flex-col border-r border-border bg-sidebar">
            <div className="flex items-center gap-2 px-3 pt-3">
              <div className="min-w-0 flex-1">
                <WorkspaceSwitcher />
              </div>
              <button onClick={() => setMenuOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-fg-3 hover:bg-surface-3" aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 pb-4">
              <NavContent onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="flex flex-col gap-3 border-t border-border p-3">
              <SidebarFooter />
            </div>
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-sm">
          <IncidentBanner />
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setMenuOpen(true)} className="-ml-1 flex size-8 items-center justify-center rounded-lg text-fg-2 hover:bg-surface-3 lg:hidden" aria-label="Open menu">
              <Menu className="size-[18px]" />
            </button>
            <Breadcrumb items={[{ label: 'Operations', to: '/ops' }, { label: title }]} />
            <div className="ml-auto flex items-center gap-4">
              <span className="hidden text-[13px] text-fg-3 xl:inline">
                Field services for <span className="font-medium text-fg-2">{partner.name}</span>
              </span>
              <span className="hidden h-4 w-px bg-border xl:block" />
              <span className="hidden items-center gap-1.5 text-[13px] text-fg-2 md:flex">
                <span className="size-1.5 rounded-full bg-good" />
                {onDuty} technicians on duty
              </span>
              <span className={cn('hidden font-mono text-xs text-fg-3 tabular sm:inline')}>{formatClock(now)}</span>
              <ThemeToggle className="lg:hidden" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
          <Outlet />
        </main>
      </div>
      <SimulatorPanel />
    </div>
  )
}
