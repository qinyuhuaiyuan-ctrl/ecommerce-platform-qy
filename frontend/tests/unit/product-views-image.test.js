import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const products = [
  {
    id: 1,
    name: 'iPhone 15 Pro',
    description: '最新款苹果手机，A17 Pro芯片',
    price: 7999,
    stock: 100,
    imageUrl: '/src/assets/images/iphone15.png'
  },
  {
    id: 2,
    name: '纯棉T恤',
    description: '',
    price: 99,
    stock: 200,
    imageUrl: ''
  },
  {
    id: 3,
    name: '牛仔裤',
    description: '经典款式，弹性面料',
    price: 199,
    stock: 150,
    imageUrl: '/src/assets/images/not-exists.png'
  }
]

const cartItems = [
  { id: 11, productName: 'iPhone 15 Pro', price: 7999, quantity: 1, subtotal: 7999, imageUrl: '/src/assets/images/iphone15.png' },
  { id: 12, productName: '纯棉T恤', price: 99, quantity: 2, subtotal: 198, imageUrl: '' }
]

vi.mock('../../src/api', () => ({
  categoryApi: { list: vi.fn(() => Promise.resolve({ data: { data: [{ id: 1, name: '电子产品' }] } })) },
  productApi: {
    list: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    getById: vi.fn(() => Promise.resolve({ data: { data: {} } }))
  },
  cartApi: {
    list: vi.fn(() => Promise.resolve({ data: { data: [] } })),
    add: vi.fn(() => Promise.resolve({ data: { code: 200 } })),
    updateQuantity: vi.fn(() => Promise.resolve({ data: { code: 200 } })),
    delete: vi.fn(() => Promise.resolve({ data: { code: 200 } }))
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: '1' } })
}))

const mountView = async (component, prepare) => {
  prepare()
  const wrapper = mount(component, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  return wrapper
}

const cards = wrapper => wrapper.findAll('.product-card')

beforeEach(() => {
  localStorage.clear()
})

it('renders a bundled image for a product with a usable image url', async () => {
  const { categoryApi, productApi } = await import('../../src/api')
  categoryApi.list.mockResolvedValue({ data: { data: [{ id: 1, name: '电子产品' }] } })
  productApi.list.mockResolvedValue({ data: { data: products } })

  const ProductList = (await import('../../src/views/ProductList.vue')).default
  const wrapper = await mountView(ProductList, () => {})

  const image = cards(wrapper)[0].find('img')
  expect(image.exists()).toBe(true)
  expect(image.attributes('src')).toContain('iphone15')
  expect(image.attributes('alt')).toBe('iPhone 15 Pro')
  expect(cards(wrapper)[0].find('.card-image').exists()).toBe(true)
})

it('falls back to the shared placeholder for empty and unresolvable image urls in the list', async () => {
  const { categoryApi, productApi } = await import('../../src/api')
  categoryApi.list.mockResolvedValue({ data: { data: [{ id: 1, name: '电子产品' }] } })
  productApi.list.mockResolvedValue({ data: { data: products } })

  const ProductList = (await import('../../src/views/ProductList.vue')).default
  const wrapper = await mountView(ProductList, () => {})

  const emptyCard = cards(wrapper)[1]
  expect(emptyCard.find('img').exists()).toBe(false)
  expect(emptyCard.text()).toContain('暂无图片')
  expect(emptyCard.find('[role="img"]').attributes('aria-label')).toContain('纯棉T恤')

  const unknownCard = cards(wrapper)[2]
  expect(unknownCard.find('img').exists()).toBe(false)
  expect(unknownCard.text()).toContain('暂无图片')
  expect(unknownCard.find('[role="img"]').classes()).toEqual(
    emptyCard.find('[role="img"]').classes()
  )

  expect(wrapper.findAll('.card-image').length).toBe(3)
})

it('keeps the list card image area at its documented height', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/views/ProductList.vue'), 'utf8')
  expect(source).toMatch(/\.product-card \.card-image\s*\{[^}]*height:\s*200px/)
  expect(source).not.toMatch(/<img\b/)
})

it('shows the detail image for the product returned by the api and placeholders when it is missing', async () => {
  const { productApi } = await import('../../src/api')
  const ProductDetail = (await import('../../src/views/ProductDetail.vue')).default

  productApi.getById.mockResolvedValue({ data: { data: products[0] } })
  const readyWrapper = await mountView(ProductDetail, () => {})
  expect(readyWrapper.find('.product-img').exists()).toBe(true)
  expect(readyWrapper.find('img').attributes('src')).toContain('iphone15')

  productApi.getById.mockResolvedValue({ data: { data: products[1] } })
  const missingWrapper = await mountView(ProductDetail, () => {})
  expect(missingWrapper.find('img').exists()).toBe(false)
  expect(missingWrapper.text()).toContain('暂无图片')
  expect(missingWrapper.find('.product-img').attributes('role')).toBe('img')
})

it('keeps the detail image square and guards the narrow layout', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/views/ProductDetail.vue'), 'utf8')
  expect(source).toMatch(/\.product-img\s*\{[^}]*width:\s*400px[^}]*height:\s*400px/)
  expect(source).toMatch(/aspect-ratio:\s*1\s*\/\s*1/)
  expect(source).not.toMatch(/<img\b/)
})

it('uses the same component and placeholder inside the cart rows', async () => {
  const { cartApi } = await import('../../src/api')
  cartApi.list.mockResolvedValue({ data: { data: cartItems } })

  const Cart = (await import('../../src/views/Cart.vue')).default
  const wrapper = await mountView(Cart, () => {})

  const rows = wrapper.findAll('.cart-item')
  expect(rows.length).toBe(2)
  expect(rows[0].find('img').attributes('src')).toContain('iphone15')
  expect(rows[1].find('img').exists()).toBe(false)
  expect(rows[1].text()).toContain('暂无图片')
  expect(wrapper.findAll('.cart-image').length).toBe(2)
})

it('keeps the cart row image at its documented size', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/views/Cart.vue'), 'utf8')
  expect(source).toMatch(/\.cart-item \.cart-image\s*\{[^}]*width:\s*80px[^}]*height:\s*80px/)
  expect(source).not.toMatch(/<img\b/)
})

it('leaves the order pages, login and register without any product image markup', () => {
  for (const view of ['OrderConfirm.vue', 'OrderList.vue', 'OrderDetail.vue', 'Login.vue', 'Register.vue']) {
    const source = readFileSync(resolve(process.cwd(), `src/views/${view}`), 'utf8')
    expect(source, `${view} 不应包含 img 标签`).not.toMatch(/<img\b/)
    expect(source, `${view} 不应引入图片组件`).not.toMatch(/ProductImage/)
  }
})
