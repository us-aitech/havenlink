import { ShieldCheck } from 'lucide-react'
import { SCENE_ICONS } from '@/components/home/icons'
import { SceneTile } from '@/components/home/Tile'
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
  const enabled = automations.filter((a) => a.enabled).length

  return (
    <>
      <PageHeader eyebrow="Automations" title="Your home runs itself" subtitle="Rules run locally on the HavenLink hub, so they keep working even if the internet goes down." />

      <SectionTitle
        action={
          <span className="text-[13px] text-fg-3 tabular">
            {enabled} of {automations.length} on
          </span>
        }
      >
        Rules
      </SectionTitle>
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {automations.map((a) => (
          <Card key={a.id} className="flex flex-col">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={cn('text-sm leading-5 font-semibold', a.enabled ? 'text-fg' : 'text-fg-2')}>{a.name}</h3>
                  {a.critical && (
                    <Badge tone="neutral" icon={ShieldCheck}>
                      Safety
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-fg-3">{!a.enabled ? 'Off' : a.lastRunAt ? `Last ran ${timeAgo(a.lastRunAt, now)}` : 'Has not run yet'}</div>
              </div>
              <Toggle checked={a.enabled} onChange={() => toggle(a.id)} tone={a.critical ? 'good' : 'accent'} label={a.name} />
            </div>
            <dl className={cn('mt-4 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-border pt-4 text-[13px] leading-5 sm:grid-cols-[56px_minmax(0,1fr)]', !a.enabled && 'opacity-60')}>
              <dt className="text-fg-3">When</dt>
              <dd className="text-fg">{a.trigger}</dd>
              <dt className="text-fg-3">Then</dt>
              <dd>
                <ul className="flex flex-col gap-1">
                  {a.actions.map((act) => (
                    <li key={act} className="flex items-start gap-2 text-fg">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-3" />
                      {act}
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>
          </Card>
        ))}
      </div>

      <SectionTitle>Scenes</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((s) => (
          <SceneTile key={s.id} layout="row" icon={SCENE_ICONS[s.icon]} name={s.name} description={s.description} active={lastSceneId === s.id} onClick={() => runScene(s.id)} />
        ))}
      </div>
    </>
  )
}
