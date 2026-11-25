import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductImage from '../../src/components/ProductImage.vue'

const seededSource = '/src/assets/images/iphone15.png'
const placeholderText = '暂无图片'

const placeholderOf = wrapper => {
  const placeholder = wrapper.find('[role="img"]')
  expect(placeholder.exists()).toBe(true)
  return placeholder
}

it('renders the bundled image with alt text and explicit loading hints', () => {
  const wrapper = mount(ProductImage, { props: { src: seededSource, alt: 'iPhone 15 Pro' } })
  const image = wrapper.find('img')
  expect(image.exists()).toBe(true)
  expect(image.attributes('alt')).toBe('iPhone 15 Pro')
  expect(image.attributes('loading')).toBe('lazy')
  expect(image.attributes('width')).toBe('300')
  expect(image.attributes('height')).toBe('200')
  expect(image.attributes('src')).toContain('iphone15')
  expect(wrapper.text()).not.toContain(placeholderText)
})

it('honours the size passed by the surrounding layout', () => {
  const wrapper = mount(ProductImage, {
    props: { src: seededSource, alt: 'iPhone 15 Pro', width: 80, height: 80 }
  })
  const image = wrapper.find('img')
  expect(image.attributes('width')).toBe('80')
  expect(image.attributes('height')).toBe('80')
})

it('renders the shared placeholder when the product has no image data', () => {
  const wrapper = mount(ProductImage, { props: { src: '', alt: '纯棉T恤' } })
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.text()).toContain(placeholderText)
  expect(placeholderOf(wrapper).attributes('aria-label')).toContain('纯棉T恤')
})

it('renders the very same placeholder for an unresolvable image path', () => {
  const emptyWrapper = mount(ProductImage, { props: { src: '', alt: '纯棉T恤' } })
  const unknownWrapper = mount(ProductImage, {
    props: { src: '/src/assets/images/not-exists.png', alt: '纯棉T恤' }
  })
  expect(unknownWrapper.find('img').exists()).toBe(false)
  expect(unknownWrapper.text()).toContain(placeholderText)
  expect(placeholderOf(unknownWrapper).classes()).toEqual(placeholderOf(emptyWrapper).classes())
  expect(unknownWrapper.find('.placeholder-text').text()).toBe(
    emptyWrapper.find('.placeholder-text').text()
  )
})

it('switches to the same placeholder after the image fails to load', async () => {
  const wrapper = mount(ProductImage, { props: { src: seededSource, alt: 'iPhone 15 Pro' } })
  await wrapper.find('img').trigger('error')
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.text()).toContain(placeholderText)
  expect(placeholderOf(wrapper).attributes('aria-label')).toContain('iPhone 15 Pro')
})

it('retries the image when the surrounding view supplies a new source', async () => {
  const wrapper = mount(ProductImage, { props: { src: seededSource, alt: 'iPhone 15 Pro' } })
  await wrapper.find('img').trigger('error')
  expect(wrapper.find('img').exists()).toBe(false)
  await wrapper.setProps({ src: '/src/assets/images/macbook.png' })
  expect(wrapper.find('img').attributes('src')).toContain('macbook')
})

it('keeps the parent class on both the image and the placeholder', async () => {
  const wrapper = mount(ProductImage, {
    props: { src: seededSource, alt: 'iPhone 15 Pro' },
    attrs: { class: 'cart-image' }
  })
  expect(wrapper.classes()).toContain('cart-image')
  await wrapper.find('img').trigger('error')
  expect(wrapper.classes()).toContain('cart-image')
})

it('only uses theme tokens for colours in the placeholder styles', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/ProductImage.vue'), 'utf8')
  const styles = source.slice(source.indexOf('<style'))
  expect(styles).toMatch(/var\(--color-surface-muted\)/)
  expect(styles).toMatch(/var\(--color-text-muted\)/)
  expect(styles).toMatch(/var\(--color-border\)/)
  expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  expect(styles).not.toMatch(/\brgba?\(/)
})
