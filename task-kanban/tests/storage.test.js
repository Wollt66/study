import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, clearState, generateId } from '../src/utils/storage.js'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loadState 返回 null 当无数据', () => {
    expect(loadState()).toBeNull()
  })

  it('saveState / loadState 正常读写', () => {
    const state = { columns: [{ id: 'todo' }], tasks: [{ id: '1' }] }
    saveState(state)
    expect(loadState()).toEqual(state)
  })

  it('loadState 格式错误时降级为 null', () => {
    localStorage.setItem('task-kanban-state-v1', '{not json')
    expect(loadState()).toBeNull()
  })

  it('loadState 结构不合法时降级为 null', () => {
    localStorage.setItem('task-kanban-state-v1', JSON.stringify({ columns: [] }))
    expect(loadState()).toBeNull()
  })

  it('clearState 清除数据', () => {
    saveState({ columns: [], tasks: [] })
    clearState()
    expect(loadState()).toBeNull()
  })

  it('generateId 唯一性', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) ids.add(generateId())
    expect(ids.size).toBe(100)
  })
})