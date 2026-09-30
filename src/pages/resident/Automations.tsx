import { ArrowRight, Clock, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { SCENE_ICONS } from '@/components/home/icons'
import { Badge, Card, PageHeader, SectionTitle, Toggle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { useStore } from '@/store/useStore'

export default function Automations() {
  const automations = useStore((s) => s.home.automations)
  const scenes = useStore((s) => s.home.scenes)
  const lastSceneId = useStore((s) => s.home.lastSceneId)
  const toggle = useStore((s) => s.toggleAutomation)
  const runScene = useStore((s) => s.runScene)
  const now = useNow(5000)

  return (
    <>
      <PageHeader eyebrow="Automations" title="Your home runs itself" subtitle="Rules run locally on the HavenLink hub — they keep working even if the internet goes down." />

      <SectionTitle>Rules</SectionTitle>
      <div className="mb-8 grid gap-3 lg:grid-cols-2">
        {automations.map((a) => (
          <Card key={a.id} className={cn('flex flex-col gap-4', !a.enabled && 'opacity-70')}>
            <div className="flex items-start gap-3">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', a.critical ? 'bg-critical-soft text-critical-fg ring-critical-line' : 'bg-accent-soft text-accent-fg ring-accent-line')}>
                {a.critical ? <ShieldAlert className="size-5" /> : <Zap className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-fg">{a.name}</h3>
                  {a.critical && <Badge tone="critical">Safety</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-fg-3">
                  <Clock className="size-3" />
                  {a.lastRunAt ? `Last ran ${timeAgo(a.lastRunAt, now)}` : 'Has not run yet'}
                </div>
              </div>
              <Toggle checked={a.enabled} onChange={() => toggle(a.id)} tone={a.critical ? 'good' : 'accent'} label={a.name} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1.4fr] sm:items-center">
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold tracking-wider text-fg-3 uppercase">When</div>
                <div className="text-sm text-fg">{a.trigger}</div>
              </div>
              <ArrowRight className="mx-auto hidden size-4 text-fg-4 sm:block" />
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="mb-1 text-[10px] font-semibold tracking-wider text-fg-3 uppercase">Then</div>
                <ul className="flex flex-col gap-1">
                  {a.actions.map((act) => (
                    <li key={act} className="flex items-start gap-2 text-sm text-fg">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                      {act}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle>Scenes</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((s) => {
          const Icon = SCENE_ICONS[s.icon]
          const active = lastSceneId === s.id
          return (
            <Card key={s.id} onClick={() => runScene(s.id)} className={cn('flex items-center gap-4', active && 'border-accent-line bg-accent-soft')}>
              <div className={cn('flex size-11 items-center justify-center rounded-xl', active ? 'bg-accent-soft text-accent-fg' : 'bg-surface-2 text-fg-3')}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg">{s.name}</div>
                <div className="text-xs text-fg-3">{s.description}</div>
              </div>
              {active ? <Badge tone="accent">Active</Badge> : <Sparkles className="size-4 text-fg-4" />}
            </Card>
          )
        })}
      </div>
    </>
  )
}
