import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AddTaskModal from '../src/components/AddTaskModal.vue'

const columns = [
  { id: 'todo', title: '待办' },
  { id: 'doing', title: '进行中' },
  { id: 'done', title: '已完成' }
]

describe('AddTaskModal', () => {
  it('visible=false 时不渲染', () => {
    const wrapper = mount(AddTaskModal, { props: { visible: false, columns, existingCategories: [] } })
    expect(wrapper.find('.modal-card').exists()).toBe(false)
  })

  it('关闭按钮触发 close 事件', async () => {
    const wrapper = mount(AddTaskModal, { props: { visible: true, columns, existingCategories: [] } })
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('空标题不触发 submit', async () => {
    const wrapper = mount(AddTaskModal, { props: { visible: true, columns, existingCategories: [] } })
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('填写标题后提交触发 submit 事件', async () => {
    const wrapper = mount(AddTaskModal, { props: { visible: true, columns, existingCategories: [] } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('我的任务')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.emitted('submit')).toBeTruthy()
    const payload = wrapper.emitted('submit')[0][0]
    expect(payload.title).toBe('我的任务')
  })

  it('分类自动补全', async () => {
    const wrapper = mount(AddTaskModal, {
      props: { visible: true, columns, existingCategories: ['开发', '测试', '设计'] }
    })
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('开')
    await inputs[1].trigger('focus')
    expect(wrapper.find('.suggest-list').exists()).toBe(true)
  })
})