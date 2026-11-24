import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('provides the complete semantic palette for light and dark appearance', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8')
  const light = css.match(/:root\s*\{([^}]*)\}/)?.[1] || ''
  const dark = css.match(/html\[data-theme="dark"\]\s*\{([^}]*)\}/)?.[1] || ''
  const tokens = ['color-bg', 'color-surface', 'color-surface-muted', 'color-text', 'color-text-muted', 'color-border', 'color-accent', 'color-accent-soft', 'color-primary', 'color-primary-hover', 'color-on-primary', 'color-danger', 'color-success', 'color-warning', 'color-info', 'color-focus', 'color-disabled-bg', 'color-disabled-text', 'assistant-start', 'assistant-end', 'assistant-on-brand', 'shadow-panel']
  for (const token of tokens) {
    expect(light).toContain(`--${token}:`)
    expect(dark).toContain(`--${token}:`)
  }
})

it('keeps the global toggle keyboard focus visible in a sticky toolbar', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/ThemeToggle.vue'), 'utf8')
  expect(component).toContain('position: sticky')
  expect(component).toContain(':focus-visible')
  expect(component).toContain('var(--color-focus)')
})

it('uses semantic colors and fits narrow screens on the login page', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/Login.vue'), 'utf8')
  expect(page).toContain('background: var(--color-bg)')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('width: min(360px, calc(100% - 32px))')
  expect(page).toContain('min-height:')
})

it('uses semantic colors and fits narrow screens on the registration page', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/Register.vue'), 'utf8')
  expect(page).toContain('background: var(--color-bg)')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('width: min(360px, calc(100% - 32px))')
  expect(page).toContain('min-height:')
})

it('adapts the product listing to semantic colors and narrow viewports', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/ProductList.vue'), 'utf8')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('color: var(--color-accent)')
  expect(page).toContain('width: min(1200px, 100%)')
  expect(page).toContain('@media (max-width: 768px)')
})

it('adapts product detail colors, image and actions to narrow screens', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/ProductDetail.vue'), 'utf8')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('max-width: 100%')
  expect(page).toContain('width: min(1200px, 100%)')
  expect(page).toContain('@media (max-width: 768px)')
})

it('adapts the cart to semantic colors and narrow screens', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/Cart.vue'), 'utf8')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('width: min(1200px, 100%)')
  expect(page).toContain('@media (max-width: 768px)')
})

it('adapts order confirmation to semantic colors and narrow screens', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/OrderConfirm.vue'), 'utf8')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('width: min(1200px, 100%)')
  expect(page).toContain('@media (max-width: 768px)')
})

it('adapts order list and status meanings to both themes', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/OrderList.vue'), 'utf8')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('.status-0 { color: var(--color-warning); }')
  expect(page).toContain('.status-2 { color: var(--color-info); }')
  expect(page).toContain('@media (max-width: 768px)')
})

it('adapts order details and status meanings to both themes', () => {
  const page = readFileSync(resolve(process.cwd(), 'src/views/OrderDetail.vue'), 'utf8')
  expect(page).toContain('background: var(--color-surface)')
  expect(page).toContain('.status-0 { color: var(--color-warning); }')
  expect(page).toContain('.status-2 { color: var(--color-info); }')
  expect(page).toContain('@media (max-width: 768px)')
})

it('adapts the assistant surface, gradient and panel to the viewport', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/FloatingAssistant.vue'), 'utf8')
  expect(component).toContain('var(--assistant-start)')
  expect(component).toContain('var(--color-surface-muted)')
  expect(component).toContain('min(360px, calc(100vw - 32px))')
  expect(component).toContain('overflow-wrap: anywhere')
})

it('applies semantic background and text to the document canvas', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8')
  expect(css).toMatch(/html\s*,\s*body\s*\{[^}]*background(?:-color)?:\s*var\(--color-bg\)/s)
  expect(css).toMatch(/html\s*,\s*body\s*\{[^}]*color:\s*var\(--color-text\)/s)
})

it('uses semantic surface colors at the application root', () => {
  const app = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')
  expect(app).toContain('background-color: var(--color-bg)')
  expect(app).toContain('color: var(--color-text)')
})
