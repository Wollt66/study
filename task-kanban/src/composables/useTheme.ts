import { ref } from 'vue'
import { themes, themeOrder } from '../config/themes'
import { applyTheme, clearTheme } from '../utils/cssVariables'

const STORAGE_KEY = 'task-kanban-theme'
const current = ref('light')

function loadSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && themes[saved]) {
      current.value = saved
      applyTheme(themes[saved].variables)
    } else {
      applyTheme(themes.light.variables)
    }
  } catch (e) {
    applyTheme(themes.light.variables)
  }
}

let initialized = false

export function useTheme() {
  if (!initialized) {
    initialized = true
    loadSaved()
  }

  function setTheme(name) {
    if (!themes[name]) return
    current.value = name
    applyTheme(themes[name].variables)
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch (e) {
      // ignore
    }
  }

  function previewTheme(name) {
    if (!themes[name]) return
    applyTheme(themes[name].variables)
  }

  function cancelPreview() {
    applyTheme(themes[current.value].variables)
  }

  function cycleTheme() {
    const idx = themeOrder.indexOf(current.value)
    const next = themeOrder[(idx + 1) % themeOrder.length]
    setTheme(next)
  }

  return {
    current,
    themes,
    themeOrder,
    setTheme,
    previewTheme,
    cancelPreview,
    cycleTheme
  }
}