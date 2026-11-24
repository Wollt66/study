import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanColumn from '../src/components/KanbanColumn.vue'

const column = { id: 'todo', title: '待办', color: '#6366f1' }
const tasks = [
  { id: 't1', title: '任务一', columnId: 'todo', starred: false, urgent: false, createdAt: Date.now() },
  { id: 't2', title: '任务二', columnId: 'todo', starred: false, urgent: false, createdAt: Date.now() }
]

describe('KanbanColumn', () => {
  it('渲染列标题', () => {
    const wrapper = mount(KanbanColumn, { props: { column, taskList: tasks } })
    expect(wrapper.text()).toContain('待办')
  })

  it('显示任务计数', () => {
    const wrapper = mount(KanbanColumn, { props: { column, taskList: tasks } })
    expect(wrapper.find('.column-count').text()).toBe('2')
  })

  it('空列显示空状态', () => {
    const wrapper = mount(KanbanColumn, { props: { column, taskList: [] } })
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(true)
  })

  it('drop 事件触发 move', async () => {
    const wrapper = mount(KanbanColumn, { props: { column, taskList: [] } })
    const dropEvent = {
      preventDefault: () => {},
      dataTransfer: { getData: () => 't1', dropEffect: '' }
    }
    await wrapper.find('.kanban-column').trigger('drop', dropEvent)
    expect(wrapper.emitted('move')).toBeTruthy()
    expect(wrapper.emitted('move')[0]).toEqual(['t1', 'todo', -1])
  })
})