import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MockEngine } from '../.cache/engine.mjs'


async function collect(tickMs, durationMs) {
  const engine = new MockEngine({ intervalMs: tickMs })
  const snaps = []
  engine.start(s => snaps.push(s))
  await new Promise(r => setTimeout(r, durationMs))
  return { engine, snaps }
}

test('快照结构与实体规模', async () => {
  const { engine, snaps } = await collect(50, 600)
  engine.dispose()
  assert.ok(snaps.length > 5, `快照数量不足: ${snaps.length}`)
  const s = snaps[snaps.length - 1]
  assert.equal(s.provinces.length, 34, '省份数量应为 34')
  assert.equal(s.cities.length, 66, '城市数量应为 66')
  assert.ok(s.intersections.length > 700, `路口数量应大于 700: ${s.intersections.length}`)
  assert.ok(s.accidents.length > 20, `活跃事故过少: ${s.accidents.length}`)
  assert.equal(s.country.hourFlow.length, 24, '24h 分时流量应为 24 点')
  assert.ok(s.country.trend.length <= 288 && s.country.trend.length >= 200, `趋势窗口异常: ${s.country.trend.length}`)
})

test('聚合口径闭合（类型求和=总量、省求和=全国）', async () => {
  const { engine, snaps } = await collect(50, 600)
  engine.dispose()
  const s = snaps[snaps.length - 1]
  const typeSum = s.country.vehicleTypes.reduce((a, v) => a + v.activeCount, 0)
  assert.ok(
    Math.abs(typeSum - s.country.activeVehicles) / s.country.activeVehicles < 0.001,
    `全国车辆类型口径不闭合: Σ${typeSum} vs ${s.country.activeVehicles}`
  )
  const ratioSum = s.country.vehicleTypes.reduce((a, v) => a + v.ratio, 0)
  assert.ok(Math.abs(ratioSum - 1) < 0.001, `占比不闭合: ${ratioSum}`)
  const provSum = s.provinces.reduce((a, p) => a + p.activeVehicles, 0)
  assert.ok(
    Math.abs(provSum - s.country.activeVehicles) / s.country.activeVehicles < 0.002,
    `省->全国聚合不闭合: Σ省${provSum} vs ${s.country.activeVehicles}`
  )
})

test('数据连续性：相邻快照变化 ≤ 15%', async () => {
  const { engine, snaps } = await collect(50, 800)
  engine.dispose()
  let maxJump = 0
  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i - 1].country.activeVehicles
    const b = snaps[i].country.activeVehicles
    const jump = Math.abs(b - a) / a
    maxJump = Math.max(maxJump, jump)
    assert.ok(jump <= 0.15, `连续性破坏: ${a} -> ${b} (${(jump * 100).toFixed(1)}%)`)
  }
  console.log(`  相邻快照最大变化 ${(maxJump * 100).toFixed(2)}%`)
})

test('早晚高峰双峰特征', async () => {
  const { engine, snaps } = await collect(50, 400)
  engine.dispose()
  const flows = snaps[snaps.length - 1].country.hourFlow.map(h => h.flow)
  const peak = Math.max(...flows)
  const valley = Math.min(...flows)
  assert.ok(peak > valley * 2.5, `双峰特征不明显: 峰${peak} 谷${valley}`)
})

test('业务值域约束', async () => {
  const { engine, snaps } = await collect(50, 400)
  engine.dispose()
  const s = snaps[snaps.length - 1]
  for (const r of [s.country, ...s.provinces, ...s.cities]) {
    assert.ok(r.congestionIndex >= 0 && r.congestionIndex <= 10, `${r.name} 拥堵指数越界: ${r.congestionIndex}`)
    assert.ok(r.avgSpeed >= 15 && r.avgSpeed <= 80, `${r.name} 平均车速越界: ${r.avgSpeed}`)
  }
})

test('暂停冻结与恢复续推', async () => {
  const engine = new MockEngine({ intervalMs: 50 })
  const snaps = []
  engine.start(s => snaps.push(s))
  await new Promise(r => setTimeout(r, 400))
  engine.pause()
  const pausedAt = snaps.length
  await new Promise(r => setTimeout(r, 300))
  assert.equal(snaps.length, pausedAt, '暂停后仍产出快照')
  engine.resume()
  await new Promise(r => setTimeout(r, 300))
  engine.dispose()
  assert.ok(snaps.length > pausedAt, '恢复后未继续产出快照')
})