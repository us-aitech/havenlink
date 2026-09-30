import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Droplets, Home, LayoutGrid, LifeBuoy, ShieldCheck, Wifi, Workflow } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import { CriticalAlertModal } from '../CriticalAlertModal'
import { SimulatorPanel } from '../SimulatorPanel'
import { StatusDot, type Tone } from '../ui'
import { LogoGlyph } from './Brand'
import { Breadcrumb, PartnerCard, SideNavSection, Sidebar, ThemeToggle, UserRow, type SideNavItem } from './Shell'

const PRIMARY: SideNavItem[] = [
  { to: '/home', label: 'Overview', icon: Home, end: true },
  { to: '/home/devices', label: 'Devices', icon: LayoutGrid },
  { to: '/home/security', label: 'Security', icon: ShieldCheck },
  { to: '/home/water', label: 'Water', icon: Droplets },
  { to: '/home/network', label: 'Internet', icon: Wifi },
]

const SECONDARY: SideNavItem[] = [
  { to: '/home/automations', label: 'Automations', icon: Workflow },
  { to: '/home/support', label: 'Support', icon: LifeBuoy },
]

const TITLES: Record<string, string> = {
  '/home': 'Overview',
  '/home/devices': 'Devices',
  '/home/security': 'Security',
  '/home/water': 'Water',
  '/home/network': 'Internet',
  '/home/automations': 'Automations',
  '/home/support': 'Support',
}

function useHomeStatus() {
  const security = useStore((s) => s.home.security)
  const water = useStore((s) => s.home.water)
  const network = useStore((s) => s.home.network)
  const securityTone: Tone = security.status === 'alarm' ? 'critical' : security.status === 'entry-delay' ? 'warning' : security.mode === 'disarmed' ? 'neutral' : 'good'
  const securityLabel =
    security.status === 'alarm' ? 'Alarm' : security.status === 'entry-delay' ? 'Entry delay' : security.status === 'arming' ? 'Arming' : security.mode === 'disarmed' ? 'Disarmed' : security.mode === 'away' ? 'Armed away' : 'Armed home'
  const waterTone: Tone = water.status === 'leak' ? 'critical' : water.status === 'warning' || water.valve !== 'open' ? 'warning' : 'good'
  const waterLabel = water.status === 'leak' ? (water.valve === 'closed' ? 'Leak contained' : 'Leak detected') : water.valve === 'closed' ? 'Valve closed' : water.status === 'warning' ? 'Unusual flow' : 'Water protected'
  const netTone: Tone = network.status === 'online' ? 'good' : network.status === 'degraded' ? 'warning' : 'critical'
  const netLabel = network.status === 'online' ? 'Online' : network.status === 'degraded' ? 'Degraded' : network.backupActive ? 'LTE backup' : 'Offline'
  return [
    { key: 'security', label: securityLabel, tone: securityTone, to: '/home/security', pulse: securityTone === 'critical' },
    { key: 'water', label: waterLabel, tone: waterTone, to: '/home/water', pulse: waterTone === 'critical' },
    { key: 'network', label: netLabel, tone: netTone, to: '/home/network', pulse: netTone === 'critical' },
  ]
}

export function ResidentLayout() {
  const { pathname } = useLocation()
  const unit = useStore((s) => s.home.unit)
  const residentName = useStore((s) => s.home.residentName)
  const alarm = useStore((s) => s.home.security.status === 'alarm')
  const status = useHomeStatus()
  const initials = residentName
    .split(' ')
    .map((p) => p[0])
    .join('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen">
      <Sidebar
        footer={
          <>
            <PartnerCard />
            <UserRow initials={initials} name={residentName} role="Homeowner" />
          </>
        }
      >
        <SideNavSection title="Home" items={PRIMARY} />
        <SideNavSection title="Manage" items={SECONDARY} />
      </Sidebar>

      <div className="lg:pl-60">
        <header className={cn('sticky top-0 z-20 border-b bg-surface/90 backdrop-blur-sm', alarm ? 'border-critical-line' : 'border-border')}>
          {alarm && <div className="h-0.5 animate-pulse bg-critical" />}
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <LogoGlyph className="lg:hidden" />
            <div className="hidden sm:block">
              <Breadcrumb items={[{ label: unit, to: '/home' }, { label: TITLES[pathname] ?? 'Home' }]} />
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {status.map((s) => (
                <NavLink key={s.key} to={s.to} className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg">
                  <StatusDot tone={s.tone} pulse={s.pulse} />
                  <span className="hidden md:inline">{s.label}</span>
                </NavLink>
              ))}
              <span className="mx-1 hidden h-4 w-px bg-border sm:block lg:hidden" />
              <ThemeToggle className="lg:hidden" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {PRIMARY.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium', isActive ? 'text-accent-fg' : 'text-fg-3')}>
              <n.icon className="size-5" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <SimulatorPanel />
      <CriticalAlertModal />
    </div>
  )
}
