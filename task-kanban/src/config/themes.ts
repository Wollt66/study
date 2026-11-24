export const themes = {
  light: {
    name: '亮色',
    icon: '☀️',
    variables: {
      '--color-bg': '#f5f7fa',
      '--color-bg-elevated': '#ffffff',
      '--color-surface': '#ffffff',
      '--color-border': '#e4e7eb',
      '--color-text': '#1f2937',
      '--color-text-secondary': '#6b7280',
      '--color-text-muted': '#9ca3af',
      '--color-primary': '#4f46e5',
      '--color-primary-hover': '#4338ca',
      '--color-primary-light': '#eef2ff'
    }
  },
  dark: {
    name: '暗色',
    icon: '🌙',
    variables: {
      '--color-bg': '#0f172a',
      '--color-bg-elevated': '#1e293b',
      '--color-surface': '#1e293b',
      '--color-border': '#334155',
      '--color-text': '#f1f5f9',
      '--color-text-secondary': '#cbd5e1',
      '--color-text-muted': '#94a3b8',
      '--color-primary': '#818cf8',
      '--color-primary-hover': '#6366f1',
      '--color-primary-light': '#312e81'
    }
  },
  colorful: {
    name: '多彩',
    icon: '🎨',
    variables: {
      '--color-bg': 'linear-gradient(135deg, #fce4ec 0%, #e3f2fd 50%, #f3e5f5 100%)',
      '--color-bg-elevated': '#ffffff',
      '--color-surface': '#ffffff',
      '--color-border': '#f8bbd0',
      '--color-text': '#4a148c',
      '--color-text-secondary': '#7b1fa2',
      '--color-text-muted': '#ba68c8',
      '--color-primary': '#e91e63',
      '--color-primary-hover': '#c2185b',
      '--color-primary-light': '#fce4ec'
    }
  }
}

export const themeOrder = ['light', 'dark', 'colorful']