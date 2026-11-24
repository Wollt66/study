export function useRipple() {
  function createRipple(event) {
    const button = event.currentTarget
    if (!button) return
    const circle = document.createElement('span')
    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    const rect = button.getBoundingClientRect()
    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${event.clientX - rect.left - radius}px`
    circle.style.top = `${event.clientY - rect.top - radius}px`
    circle.style.position = 'absolute'
    circle.style.borderRadius = '50%'
    circle.style.background = 'rgba(255,255,255,0.4)'
    circle.style.transform = 'scale(0)'
    circle.style.animation = 'ripple 0.6s linear'
    circle.style.pointerEvents = 'none'

    const existing = button.querySelector('.ripple-effect')
    if (existing) existing.remove()
    circle.classList.add('ripple-effect')
    button.appendChild(circle)

    setTimeout(() => circle.remove(), 600)
  }

  return { createRipple }
}