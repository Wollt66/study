<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  effect: { type: String, default: 'confetti' },
  duration: { type: Number, default: 1800 }
})
const emit = defineEmits(['complete'])

const canvasRef = ref(null)
let animationId = null
let particles = []
let startTime = 0

function createParticles(width, height) {
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#fbbf24']
  const shapes = ['rect', 'circle', 'star', 'heart']
  const arr = []
  const count = 80
  for (let i = 0; i < count; i++) {
    arr.push({
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 4,
      gravity: 0.25,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1
    })
  }
  return arr
}

function drawStar(ctx, x, y, size, color, rotation) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const r = i % 2 === 0 ? size : size / 2
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawHeart(ctx, x, y, size, color, rotation) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, size / 4)
  ctx.bezierCurveTo(0, size / 2, -size / 2, size / 2, -size / 2, 0)
  ctx.bezierCurveTo(-size / 2, -size / 2, 0, -size / 2, 0, -size / 4)
  ctx.bezierCurveTo(0, -size / 2, size / 2, -size / 2, size / 2, 0)
  ctx.bezierCurveTo(size / 2, size / 2, 0, size / 2, 0, size / 4)
  ctx.fill()
  ctx.restore()
}

function animate() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const elapsed = Date.now() - startTime

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles.forEach((p) => {
    p.vy += p.gravity
    p.x += p.vx
    p.y += p.vy
    p.rotation += p.vr
    if (elapsed > props.duration * 0.6) {
      p.life -= 0.02
    }

    ctx.globalAlpha = Math.max(0, p.life)
    if (p.shape === 'rect') {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    } else if (p.shape === 'circle') {
      ctx.beginPath()
      ctx.fillStyle = p.color
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, p.size / 2, p.color, p.rotation)
    } else if (p.shape === 'heart') {
      drawHeart(ctx, p.x, p.y, p.size, p.color, p.rotation)
    }
  })
  ctx.globalAlpha = 1

  if (elapsed < props.duration) {
    animationId = requestAnimationFrame(animate)
  } else {
    cancelAnimationFrame(animationId)
    animationId = null
    emit('complete')
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      const canvas = canvasRef.value
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particles = createParticles(canvas.width, canvas.height)
      startTime = Date.now()
      animationId = requestAnimationFrame(animate)
    } else {
      if (animationId) cancelAnimationFrame(animationId)
      animationId = null
      particles = []
    }
  }
)

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<template>
  <canvas v-if="visible" ref="canvasRef" class="celebration-canvas"></canvas>
</template>

<style scoped>
.celebration-canvas {
  position: fixed;
  inset: 0;
  z-index: var(--z-celebration);
  pointer-events: none;
}
</style>