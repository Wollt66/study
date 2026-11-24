export function applyTheme(themeVariables) {
  if (!themeVariables || typeof themeVariables !== 'object') return
  const root = document.documentElement
  for (const [key, value] of Object.entries(themeVariables)) {
    if (key === '--color-bg' && value.includes('gradient')) {
      root.style.setProperty(key, value)
      root.style.setProperty('--color-bg-raw', 'transparent')
    } else {
      root.style.setProperty(key, value)
    }
  }
}

export function clearTheme() {
  const root = document.documentElement
  const keys = [
    '--color-bg', '--color-bg-elevated', '--color-surface', '--color-border',
    '--color-text', '--color-text-secondary', '--color-text-muted',
    '--color-primary', '--color-primary-hover', '--color-primary-light'
  ]
  keys.forEach((k) => root.style.removeProperty(k))
}

export function getCssVariable(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}