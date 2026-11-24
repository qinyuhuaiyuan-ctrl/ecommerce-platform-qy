import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import ProductList from '../../src/views/ProductList.vue'
import Login from '../../src/views/Login.vue'
import OrderConfirm from '../../src/views/OrderConfirm.vue'
import Cart from '../../src/views/Cart.vue'
import App from '../../src/App.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../src/api', () => ({
  categoryApi: { list: vi.fn(async () => ({ data: { data: [] } })) },
  productApi: { list: vi.fn(async () => ({ data: { data: [] } })) },
  cartApi: { add: vi.fn(), updateQuantity: vi.fn(), delete: vi.fn(), list: vi.fn(async () => ({ data: { data: [] } })) },
  orderApi: { create: vi.fn() },
  userApi: { login: vi.fn() },
  assistantApi: { chat: vi.fn(async () => ({ data: { data: { reply: '答复' } } })) }
}))

it('preserves login form and makes no request when changing theme', async () => {
  const { userApi } = await import('../../src/api')
  let listener
  let state = { effective: 'light', persistence: 'untouched' }
  window.__ECOMMERCE_THEME__ = {
    start() {}, dispose() {},
    subscribe(fn) { listener = fn; fn(state); return () => {} },
    toggle() { state = { ...state, effective: 'dark' }; listener(state) }
  }
  const wrapper = mount(App, { global: { stubs: { RouterView: Login, RouterLink: true, FloatingAssistant: true } } })
  const inputs = wrapper.findAll('input')
  await inputs[0].setValue('buyer')
  await inputs[1].setValue('secret')
  await wrapper.get('.theme-toolbar button').trigger('click')
  expect(wrapper.findAll('input')[0].element.value).toBe('buyer')
  expect(wrapper.findAll('input')[1].element.value).toBe('secret')
  expect(userApi.login).not.toHaveBeenCalled()
  wrapper.unmount()
  delete window.__ECOMMERCE_THEME__
})

it('preserves the open assistant and unsent text when changing theme', async () => {
  const { assistantApi } = await import('../../src/api')
  let listener
  window.__ECOMMERCE_THEME__ = {
    start() {}, dispose() {}, subscribe(fn) { listener = fn; fn({ effective: 'light', persistence: 'untouched' }); return () => {} },
    toggle() { listener({ effective: 'dark', persistence: 'saved' }) }
  }
  const wrapper = mount(App, { global: { stubs: { RouterView: true } } })
  await wrapper.get('.assistant-bubble').trigger('click')
  await wrapper.get('.assistant-input input').setValue('未发送的问题')
  await wrapper.get('.theme-toolbar button').trigger('click')
  expect(wrapper.get('.assistant-input input').element.value).toBe('未发送的问题')
  expect(assistantApi.chat).not.toHaveBeenCalled()
  wrapper.unmount()
  delete window.__ECOMMERCE_THEME__
})

it('keeps assistant conversation and pending request across theme changes', async () => {
  const { assistantApi } = await import('../../src/api')
  let resolveReply
  assistantApi.chat.mockReset().mockImplementation(() => new Promise(resolve => { resolveReply = resolve }))
  let listener
  window.__ECOMMERCE_THEME__ = {
    start() {}, dispose() {}, subscribe(fn) { listener = fn; fn({ effective: 'light', persistence: 'untouched' }); return () => {} },
    toggle() { listener({ effective: 'dark', persistence: 'saved' }) }
  }
  const wrapper = mount(App, { global: { stubs: { RouterView: true } } })
  await wrapper.get('.assistant-bubble').trigger('click')
  await wrapper.get('.assistant-input input').setValue('商品咨询')
  await wrapper.get('.assistant-input button').trigger('click')
  expect(wrapper.text()).toContain('商品咨询')
  expect(wrapper.get('.assistant-input input').element.disabled).toBe(true)
  await wrapper.get('.theme-toolbar button').trigger('click')
  expect(wrapper.text()).toContain('商品咨询')
  expect(wrapper.get('.assistant-input input').element.disabled).toBe(true)
  expect(assistantApi.chat).toHaveBeenCalledTimes(1)
  resolveReply({ data: { data: { reply: '收到咨询' } } })
  await flushPromises()
  expect(wrapper.text()).toContain('收到咨询')
  expect(wrapper.get('.assistant-input input').element.disabled).toBe(false)
  wrapper.unmount()
  delete window.__ECOMMERCE_THEME__
  assistantApi.chat.mockReset()
})

it('preserves checkout address and does not submit an order on theme change', async () => {
  const { orderApi, cartApi } = await import('../../src/api')
  let listener
  window.__ECOMMERCE_THEME__ = {
    start() {}, dispose() {}, subscribe(fn) { listener = fn; fn({ effective: 'light', persistence: 'untouched' }); return () => {} },
    toggle() { listener({ effective: 'dark', persistence: 'saved' }) }
  }
  const wrapper = mount(App, { global: { stubs: { RouterView: OrderConfirm, FloatingAssistant: true } } })
  const inputs = wrapper.findAll('.form input')
  await inputs[0].setValue('收货人')
  await inputs[1].setValue('12345678')
  await inputs[2].setValue('测试地址')
  const count = cartApi.list.mock.calls.length
  await wrapper.get('.theme-toolbar button').trigger('click')
  expect(wrapper.findAll('.form input').map(input => input.element.value)).toEqual(['收货人', '12345678', '测试地址'])
  expect(orderApi.create).not.toHaveBeenCalled()
  expect(cartApi.list).toHaveBeenCalledTimes(count)
  wrapper.unmount()
  delete window.__ECOMMERCE_THEME__
})

it('keeps the loaded cart and avoids new cart requests on theme change', async () => {
  const { cartApi } = await import('../../src/api')
  cartApi.list.mockReset().mockResolvedValue({ data: { data: [{ id: 9, productName: '茶杯', price: 10, quantity: 3, subtotal: 30 }] } })
  cartApi.updateQuantity.mockClear()
  cartApi.delete.mockClear()
  let listener
  window.__ECOMMERCE_THEME__ = {
    start() {}, dispose() {}, subscribe(fn) { listener = fn; fn({ effective: 'light', persistence: 'untouched' }); return () => {} },
    toggle() { listener({ effective: 'dark', persistence: 'saved' }) }
  }
  const wrapper = mount(App, { global: { stubs: { RouterView: Cart, RouterLink: true, FloatingAssistant: true } } })
  await flushPromises()
  expect(wrapper.text()).toContain('茶杯')
  expect(wrapper.get('.quantity span').text()).toBe('3')
  await wrapper.get('.theme-toolbar button').trigger('click')
  expect(wrapper.text()).toContain('茶杯')
  expect(wrapper.get('.quantity span').text()).toBe('3')
  expect(cartApi.list).toHaveBeenCalledTimes(1)
  expect(cartApi.updateQuantity).not.toHaveBeenCalled()
  expect(cartApi.delete).not.toHaveBeenCalled()
  wrapper.unmount()
  delete window.__ECOMMERCE_THEME__
  cartApi.list.mockReset().mockResolvedValue({ data: { data: [] } })
})

it('logout clears identity only while retaining theme and unrelated data', async () => {
  localStorage.setItem('userId', '7')
  localStorage.setItem('username', 'test')
  localStorage.setItem('ecommerce.display.theme.v1', 'dark')
  localStorage.setItem('sentinel', 'keep')
  const wrapper = mount(ProductList, { global: { stubs: { RouterLink: true } } })
  await wrapper.findAll('a').find(a => a.text() === '退出').trigger('click')
  expect(localStorage.getItem('userId')).toBeNull()
  expect(localStorage.getItem('username')).toBeNull()
  expect(localStorage.getItem('ecommerce.display.theme.v1')).toBe('dark')
  expect(localStorage.getItem('sentinel')).toBe('keep')
  expect(push).toHaveBeenCalledWith('/login')
  wrapper.unmount()
  localStorage.clear()
})
