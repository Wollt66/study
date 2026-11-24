export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function fmtInt(value: number): string {
  return Math.round(value).toLocaleString('zh-CN')
}

export function fmtDecimal(value: number, digits = 1): string {
  return value.toFixed(digits)
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function fmtClock(ts: number): string {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function fmtDate(ts: number): string {
  const d = new Date(ts)
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} 星期${week}`
}

export function fmtHourMinute(ts: number): string {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function fmtAgo(ts: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - ts) / 60000))
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${diff} 分钟前`
  return `${Math.floor(diff / 60)} 小时 ${diff % 60} 分前`
}