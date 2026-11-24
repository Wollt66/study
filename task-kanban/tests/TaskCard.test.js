import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskCard from '../src/components/TaskCard.vue'

const baseTask = {
  id: 't1',
  title: '测试任务',
  description: '描述',
  category: '开发',
  columnId: 'todo',
  starred: false,
  urgent: false,
  createdAt: Date.now()
}

describe('TaskCard', () => {
  it('渲染标题和分类', () => {
    const wrapper = mount(TaskCard, { props: { task: baseTask } })
    expect(wrapper.text()).toContain('测试任务')
    expect(wrapper.text()).toContain('开发')
  })

  it('星标按钮触发 toggle-star 事件', async () => {
    const wrapper = mount(TaskCard, { props: { task: baseTask } })
    await wrapper.find('.star-btn').trigger('click')
    expect(wrapper.emitted('toggle-star')).toBeTruthy()
    expect(wrapper.emitted('toggle-star')[0]).toEqual(['t1'])
  })

  it('紧急按钮触发 toggle-urgent 事件', async () => {
    const wrapper = mount(TaskCard, { props: { task: baseTask } })
    await wrapper.find('.urgent-btn').trigger('click')
    expect(wrapper.emitted('toggle-urgent')).toBeTruthy()
    expect(wrapper.emitted('toggle-urgent')[0]).toEqual(['t1'])
  })

  it('删除按钮触发 remove 事件', async () => {
    const wrapper = mount(TaskCard, { props: { task: baseTask } })
    await wrapper.find('.remove-btn').trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')[0]).toEqual(['t1'])
  })

  it('星标任务应用 starred 类', () => {
    const wrapper = mount(TaskCard, { props: { task: { ...baseTask, starred: true } } })
    expect(wrapper.find('.task-card').classes()).toContain('starred')
  })

  it('紧急任务应用 urgent 类', () => {
    const wrapper = mount(TaskCard, { props: { task: { ...baseTask, urgent: true } } })
    expect(wrapper.find('.task-card').classes()).toContain('urgent')
  })
})