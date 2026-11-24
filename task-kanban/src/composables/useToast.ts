import { ref } from 'vue'

const toasts = ref([])
let uid = 0

export function useToast() {
  function show(message, type = 'info', duration = 2600) {
    const id = ++uid
    toasts.value.push({ id, message, type, duration })
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }

  function remove(id) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  function clear() {
    toasts.value = []
  }

  function success(message, duration) {
    return show(message, 'success', duration)
  }

  function error(message, duration) {
    return show(message, 'error', duration ?? 3200)
  }

  return { toasts, show, remove, clear, success, error }
}