import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Cable,
  CheckCircle2,
  Cpu,
  Droplets,
  HardHat,
  Headset,
  Home,
  Network,
  ShieldCheck,
  Siren,
  Smartphone,
  Split,
  TrendingUp,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { LogoGlyph } from '@/components/layout/Brand'
import { ThemeToggle } from '@/components/layout/Shell'
import { Badge, Button, StatusDot } from '@/components/ui'
import { BRAND, PARTNERS } from '@/config'
import { cn } from '@/lib/cn'
import { usePartner } from '@/lib/hooks'
import { useStore } from '@/store/useStore'

const CHAIN: Array<{ icon: LucideIcon; title: string; hint: string }> = [
  { icon: Network, title: 'ISP core & OLT', hint: 'Central office' },
  { icon: Split, title: 'Splitters', hint: '1:4 and 1:8 in cabinets and pedestals' },
  { icon: Cable, title: 'Drop & ONT', hint: 'Fiber terminates at the home' },
  { icon: Cpu, title: 'HavenLink hub', hint: 'Local automation with LTE backup' },
  { icon: Smartphone, title: 'Resident app', hint: 'Control, alerts and support' },
]

const SERVICES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Wrench, title: 'Fiber/GPON maintenance', text: 'Scheduled inspections of cabinets, pedestals, risers and slack storage, with light-level testing at splitter and ONT points.' },
  { icon: Zap, title: 'Trouble-call response', text: 'The ISP dispatches, we respond within SLA: diagnose ONT, drop, splitter and cabinet, then repair, test and photo-document.' },
  { icon: HardHat, title: 'Emergency fiber repair', text: 'Cut fiber, weather damage, vandalism or construction impact. PON alarms open P1 work orders automatically.' },
  { icon: Home, title: 'Smart-home installation', text: 'Cameras, thermostats, locks, mesh WiFi and automation — including automatic water shut-off.' },
  { icon: Headset, title: 'Resident support', text: 'Scheduling, onboarding, device optimization and ticket closure in one workflow.' },
]

const BENEFITS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Users, title: 'Single vendor', text: 'Construction, maintenance and smart-home under one contract.' },
  { icon: TrendingUp, title: 'Higher ARPU', text: 'Smart-home packages on top of every fiber subscription.' },
  { icon: Headset, title: 'Lower support load', text: 'Device-level issues are handled by the field team.' },
  { icon: ShieldCheck, title: 'Better uptime', text: 'Proactive maintenance and rapid, documented repairs.' },
  { icon: Building2, title: 'Turnkey MDU technology', text: 'A ready offer for property managers and developers.' },
  { icon: BadgeDollarSign, title: 'Smart-property ISP', text: 'A clear differentiator in competitive markets.' },
]

const SCENARIOS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Droplets, title: 'Burst pipe at 2 AM', text: 'Flow spikes to 10 GPM, the main valve closes in 3 seconds, the resident is alerted and a follow-up work order is opened.' },
  { icon: Cable, title: 'Fiber cut in the street', text: 'Eight homes lose light. A P1 emergency is dispatched, hubs fail over to LTE and service returns when the ticket closes.' },
  { icon: Siren, title: 'Break-in while away', text: 'The lanai door opens while armed: siren, cameras recording, monitoring center notified, PIN to disarm.' },
]

function Section({ id, eyebrow, title, description, children, className }: { id?: string; eyebrow: string; title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('border-t border-border py-16 sm:py-20', className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <div className="text-[13px] font-medium text-accent-fg">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">{title}</h2>
          {description && <p className="mt-3 text-[15px] leading-relaxed text-fg-3">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

function ProductPreview() {
  const partner = usePartner()
  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-surface-2 p-3 shadow-xl">
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <LogoGlyph className="size-6" />
              <div className="leading-tight">
                <div className="text-[13px] font-semibold text-fg">1420 Palm Cove Dr</div>
                <div className="text-[11px] text-fg-3">Harbour Heights, FL</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-fg-2">
              <span className="flex items-center gap-1.5">
                <StatusDot tone="good" />
                Armed away
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <StatusDot tone="good" />
                {partner.short} fiber
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 rounded-lg border border-critical-line bg-critical-soft p-3">
              <Droplets className="mt-0.5 size-4 shrink-0 text-critical-fg" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-critical-fg">Leak detected — water shut off</div>
                <div className="mt-0.5 text-xs leading-relaxed text-fg-2">Abnormal flow of 9.8 GPM at the main line. Valve closed automatically in 2.9 s.</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Flow', value: '0.0', unit: 'GPM' },
                { label: 'Valve', value: 'Closed', unit: '' },
                { label: 'Damage avoided', value: '4,560', unit: 'gal' },
              ].map((k) => (
                <div key={k.label} className="rounded-lg bg-surface-2 p-3">
                  <div className="text-[11px] text-fg-3">{k.label}</div>
                  <div className="mt-1 text-base font-semibold text-fg tabular">
                    {k.value} <span className="text-[11px] font-medium text-fg-3">{k.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <svg viewBox="0 0 300 64" className="mt-4 h-16 w-full" aria-hidden="true">
              <line x1="0" x2="300" y1="18" y2="18" strokeDasharray="4 4" style={{ stroke: 'var(--critical)' }} strokeWidth="1" />
              <path d="M0 58 L40 58 L52 40 L70 40 L78 58 L150 58 L158 30 L168 6 L182 6 L190 58 L300 58" fill="none" style={{ stroke: 'var(--series-1)' }} strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 hidden w-64 rounded-xl border border-border bg-surface p-3 shadow-lg sm:block">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-fg-3">WO-1057</span>
          <Badge tone="critical">P1</Badge>
        </div>
        <div className="mt-1.5 text-[13px] font-medium text-fg">Fiber cut — SP-PC-1A</div>
        <div className="text-xs text-fg-3">8 homes on LTE backup · Derek Chen en route</div>
        <div className="mt-2.5 flex gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full', i < 3 ? 'bg-accent' : 'bg-surface-3')} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const partner = usePartner()
  const setPartner = useStore((s) => s.setPartner)

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoGlyph />
            <span className="text-sm font-semibold tracking-[-0.01em] text-fg">{BRAND.name}</span>
          </Link>
          <nav className="hidden items-center gap-5 text-[13px] text-fg-3 md:flex">
            <a href="#platform" className="hover:text-fg">
              Platform
            </a>
            <a href="#services" className="hover:text-fg">
              Services
            </a>
            <a href="#demo" className="hover:text-fg">
              Demo
            </a>
            <a href="#isp" className="hover:text-fg">
              For ISPs
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/home" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Resident app
              </Button>
            </Link>
            <Link to="/ops">
              <Button variant="primary" size="sm">
                Operations console
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
          <div>
            <Badge tone="neutral">Partner expansion proposal · Proof of concept</Badge>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-fg sm:text-5xl">The fiber you built, now protecting the homes it connects.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-fg-3 sm:text-lg">
              {BRAND.name} turns an ISP’s fiber footprint into a smart-property platform — maintenance, trouble calls, emergency repair and in-home automation, delivered by one field-services partner.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/home">
                <Button variant="primary" size="lg" iconRight={ArrowRight}>
                  Open the resident app
                </Button>
              </Link>
              <Link to="/ops">
                <Button variant="secondary" size="lg">
                  Operations console
                </Button>
              </Link>
            </div>
            <div className="mt-10">
              <div className="text-xs font-medium text-fg-3">Network partner for this demo</div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {PARTNERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPartner(p.id)}
                    aria-pressed={partner.id === p.id}
                    className={cn(
                      'flex h-8 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                      partner.id === p.id ? 'border-accent-line bg-accent-soft text-accent-fg' : 'border-border bg-surface text-fg-2 hover:border-border-strong',
                    )}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: p.accent }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ProductPreview />
        </section>

        <Section id="platform" eyebrow="Platform" title="From the central office to the valve under the sink" description={`One data model connects ${partner.name}’s GPON network, the field team and every device in the home.`} className="bg-bg">
          <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">
            {CHAIN.map((c, i) => (
              <li key={c.title} className="flex flex-col gap-3 bg-surface p-5">
                <div className="flex items-center justify-between">
                  <c.icon className="size-5 text-fg-2" />
                  <span className="font-mono text-xs text-fg-4">0{i + 1}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-fg">{c.title}</div>
                  <div className="mt-1 text-[13px] leading-snug text-fg-3">{c.hint}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link to="/home" className="group rounded-xl border border-border bg-surface p-6 shadow-xs transition hover:border-border-strong hover:shadow-sm">
              <Smartphone className="size-5 text-fg-2" />
              <div className="mt-4 text-base font-semibold text-fg">Resident app</div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-3">Lights, locks, alarm, cameras, climate, leak detection with automatic shut-off, and the home’s fiber connection — with support one tap away.</p>
              <div className="mt-5 flex items-center gap-1 text-[13px] font-medium text-accent-fg">
                Open resident app <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
            <Link to="/ops" className="group rounded-xl border border-border bg-surface p-6 shadow-xs transition hover:border-border-strong hover:shadow-sm">
              <Building2 className="size-5 text-fg-2" />
              <div className="mt-4 text-base font-semibold text-fg">Operations console</div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-3">GPON network health, trouble calls with SLA, emergency repairs, preventive maintenance, the install pipeline and revenue — for the field team and the ISP.</p>
              <div className="mt-5 flex items-center gap-1 text-[13px] font-medium text-accent-fg">
                Open operations console <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>
        </Section>

        <Section id="services" eyebrow="Expanded services" title="One field partner for the full lifecycle" description="Built on the fiber construction and GPON build-outs already delivered for the ISP.">
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title}>
                <s.icon className="size-5 text-fg-2" />
                <div className="mt-3 text-sm font-semibold text-fg">{s.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-3">{s.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="demo" eyebrow="Live demo" title="Three scenarios, both portals, in real time" description="Open the resident app and the operations console side by side, then use Demo controls (bottom-right) to trigger each event." className="bg-bg">
          <div className="grid gap-4 md:grid-cols-3">
            {SCENARIOS.map((s, i) => (
              <div key={s.title} className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-fg-2" />
                  <span className="text-xs font-medium text-fg-4">Scenario {i + 1}</span>
                </div>
                <div className="mt-4 text-sm font-semibold text-fg">{s.title}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-3">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/home">
              <Button variant="primary" iconRight={ArrowRight}>
                Start the demo
              </Button>
            </Link>
            <span className="text-[13px] text-fg-3">Demo PIN 1234 · Everything runs in the browser</span>
          </div>
        </Section>

        <Section id="isp" eyebrow={`For ${partner.short}`} title="Why it matters to the ISP">
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3 bg-surface p-5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
                <div>
                  <div className="text-sm font-semibold text-fg">{b.title}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <LogoGlyph className="size-5 rounded-md" />
            <span>
              {BRAND.name} · {BRAND.region}
            </span>
          </div>
          <span>Front-end proof of concept — devices, network and field data are simulated.</span>
        </div>
      </footer>
    </div>
  )
}
