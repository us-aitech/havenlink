import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ['bg', 'surface', 'surface-2', 'surface-3', 'sidebar', 'border', 'border-strong', 'fg', 'fg-2', 'fg-3', 'fg-4', 'accent', 'accent-hover', 'accent-soft', 'accent-fg', 'accent-line', 'on-accent', 'control-off', 'overlay'],
    },
  },
})

export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(' '))
}
