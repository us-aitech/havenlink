# HavenLink design system

**Intent:** a calm, precise, enterprise-grade interface. Hierarchy comes from typography, spacing and alignment. Color is reserved for meaning (status and the single brand accent), never decoration. Light theme first, with a matching dark theme.

References: Linear, Stripe Dashboard, Vercel, Apple Home.

## 1. Tokens (semantic only)

All colors come from CSS variables defined in `src/index.css` (light in `:root`, dark in `[data-theme="dark"]`) and exposed as Tailwind colors. **Never** use raw Tailwind palette colors (`zinc-*`, `emerald-*`, `rose-*`…), hex values or `white/x` / `black/x` overlays in UI code. The only exceptions are illustrations that depict a physical scene (camera feeds).

| Role | Classes |
| --- | --- |
| App background | `bg-bg` |
| Card / panel / popover | `bg-surface` |
| Subtle fill (inner tiles, table header, footers) | `bg-surface-2` |
| Hover / pressed / segmented track | `bg-surface-3` |
| Hairlines | `border-border`, `divide-border` · stronger: `border-border-strong` |
| Text | `text-fg` (primary) · `text-fg-2` (secondary) · `text-fg-3` (meta, labels) · `text-fg-4` (placeholder, disabled, separators) |
| Brand accent | `bg-accent` `hover:bg-accent-hover` `text-on-accent` · soft: `bg-accent-soft text-accent-fg border-accent-line` |
| Status | `good` · `warning` · `serious` · `critical` · `info` · `neutral`, each with `-soft` (tint bg), `-fg` (text on tint / colored text), `-line` (border/ring) and the solid base (`bg-good`, dots, bars) |
| Charts | `SERIES[n]`, `STATUS`, `CHART_INK` from `components/charts/palette.ts` (CSS vars — apply through `style`, not SVG presentation attributes) |

## 2. Foundations

- **Type scale:** 12 / 13 / 14 / 16 / 22–24 px. Page title → `PageHeader`. Card title `text-sm font-semibold`. Body `text-[13px]` or `text-sm`. Meta `text-xs text-fg-3`. KPI value `text-2xl font-semibold tracking-[-0.02em] tabular`. Numbers always `tabular`.
- **Case:** sentence case everywhere. No uppercase + letter-spacing labels.
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32. Card padding `p-5` (KPI tiles `p-4`). Gap between cards `gap-4`; between page sections `mb-6` / `gap-6`.
- **Radius:** cards/panels/modals `rounded-xl`; inner tiles, buttons, inputs `rounded-lg`; badges/chips `rounded-md`; `rounded-full` only for avatars, dots, toggles.
- **Elevation:** cards `shadow-xs`; popovers/toasts `shadow-lg`; modals/drawers `shadow-xl`. No glows, no colored shadows, no gradients (chart area fills excepted).
- **Icons:** lucide at `size-4` (stroke 1.75 globally), default `text-fg-3`. Icons clarify; they do not decorate. **Do not** put icons inside colored squares/circles unless the box itself encodes status.

## 3. Components (`src/components/ui.tsx`)

`Card`, `CardHeader` (title + subtitle + action; icon prop is ignored on purpose), `Button` (primary · secondary · ghost · danger · success), `IconButton`, `Badge` (tone), `StatusDot`, `Toggle`, `Slider`, `Stat` (KPI tile), `PageHeader`, `Segmented`, `ProgressBar`, `Modal`, `Drawer`, `EmptyState`, `KeyValue`, `Avatar`, `Input`, `Textarea`, `Select`, `Field`, `SectionTitle`. Use them before writing new markup.

### Patterns

- **KPI row:** `grid grid-cols-2 gap-4 lg:grid-cols-4` (or 6 on `xl`) of `Stat`. Label says what it measures; hint gives context (period, breakdown).
- **Table in a card:**
  ```tsx
  <Card padded={false}>
    <div className="px-5 pt-5"><CardHeader title="…" subtitle="…" action={…} /></div>
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead><tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
          <th className="px-5 py-2 font-medium">Column</th>…
        </tr></thead>
        <tbody className="divide-y divide-border">
          <tr className="hover:bg-surface-2">…<td className="px-5 py-3">…</td></tr>
        </tbody>
      </table>
    </div>
  </Card>
  ```
- **List in a card:** `divide-y divide-border`, rows `py-3`, primary text `text-[13px] font-medium text-fg`, meta `text-xs text-fg-3`, trailing badge/value right-aligned.
- **Inner tiles:** `rounded-lg bg-surface-2 p-3` (no border) or `rounded-lg border border-border p-3` (no fill). Never both, never a card inside a card.
- **Status:** always label + color (Badge, or StatusDot + text). Critical states may tint the whole card: `border-critical-line bg-critical-soft`.
- **Selectable tiles** (scenes, rooms, devices): `rounded-lg border border-border bg-surface p-3 hover:border-border-strong`; selected/active: `border-accent-line bg-accent-soft`.
- **Empty states:** `EmptyState` with one sentence of guidance.

## 4. Content

Concise, confident, specific. "3 homes without service" not "Some homes may be affected". Units: `9.5 GPM`, `-19.4 dBm`, `74°F`, `$54.7k`. No exclamation marks.

## 5. Anti-patterns (reject in review)

- Raw palette classes, hex colors, `white/x` overlays in UI code.
- Decorative colored icon boxes, gradient text, glows, neon accents.
- Uppercase tracked micro-labels.
- Boxes inside boxes (bordered + filled tile inside a card inside a card).
- Status conveyed by color only.
- Inconsistent radius (`rounded-2xl` on inner elements, `rounded-3xl` anywhere).

## 6. QA checklist

- [ ] Only semantic tokens (grep for `zinc-|emerald-|rose-|amber-|sky-|cyan-|violet-|#[0-9a-f]{6}|white/|black/`).
- [ ] Looks right in light **and** dark (`document.documentElement.dataset.theme = 'dark'`).
- [ ] Works at 375 px (no page-level horizontal scroll) and at 1440 px.
- [ ] Visible focus ring on every interactive element; toggles and segmented controls expose `role`/`aria-*`.
- [ ] Text contrast ≥ 4.5:1 (`text-fg-3` is the lowest for readable text; `text-fg-4` only for placeholders/separators).
