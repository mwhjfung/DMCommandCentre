export type ThemeMode = 'light' | 'dark'

/** Preset primary colours offered in settings (plus a custom picker). */
export const ACCENT_PRESETS = ['#1fe0ff', '#a472ff', '#ff3d8b', '#22e29a', '#38bdf8', '#d98a3d', '#ff5470']

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const triplet = ([r, g, b]: [number, number, number]): string => `${r} ${g} ${b}`

const darken = ([r, g, b]: [number, number, number], amt = 0.18): [number, number, number] => [
  Math.round(r * (1 - amt)),
  Math.round(g * (1 - amt)),
  Math.round(b * (1 - amt))
]

/** Black or white text for the given accent, by perceived luminance. */
const foreground = ([r, g, b]: [number, number, number]): string =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '0 0 0' : '255 255 255'

/**
 * Apply the (cyberpunk) theme in light or dark, plus an optional primary-colour
 * override that recolours the accent while keeping the rest of the palette. Pass
 * an empty accent to use the theme's own primary.
 */
export function applyTheme(mode: ThemeMode, accent: string): void {
  const root = document.documentElement
  root.dataset.theme = `cyberpunk-${mode}`

  const rgb = accent ? hexToRgb(accent) : null
  if (rgb) {
    root.style.setProperty('--accent', triplet(rgb))
    root.style.setProperty('--accent-strong', triplet(darken(rgb)))
    root.style.setProperty('--accent-fg', foreground(rgb))
  } else {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-strong')
    root.style.removeProperty('--accent-fg')
  }
}
