import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeToggle from '../../src/components/ThemeToggle.vue'
import App from '../../src/App.vue'
import { startTheme, disposeTheme, useTheme } from '../../src/theme/index.js'

it('registers app-level theme cleanup for Vite hot replacement', () => {
  const entry = readFileSync(resolve(process.cwd(), 'src/main.js'), 'utf8')
  expect(entry).toMatch(/import\.meta\.hot\.dispose\(disposeTheme\)/)
})

it('shares one application subscription and releases it once', () => {
  const unsubscribe = vi.fn()
  const subscribe = vi.fn(listener => { listener({ effective: 'light' }); return unsubscribe })
  const dispose = vi.fn()
  window.__ECOMMERCE_THEME__ = { start: vi.fn(), subscribe, dispose, toggle: vi.fn() }
  startTheme()
  startTheme()
  expect(useTheme().state.value.effective).toBe('light')
  expect(subscribe).toHaveBeenCalledTimes(1)
  disposeTheme()
  disposeTheme()
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  expect(dispose).toHaveBeenCalledTimes(1)
  delete window.__ECOMMERCE_THEME__
})

it('reconnects the application adapter after hot-update cleanup', () => {
  const dispose = vi.fn()
  const unsubscribe = vi.fn()
  const subscribe = vi.fn(listener => { listener({ effective: 'light' }); return unsubscribe })
  window.__ECOMMERCE_THEME__ = { start: vi.fn(), subscribe, dispose, toggle: vi.fn() }
  startTheme()
  disposeTheme()
  startTheme()
  expect(subscribe).toHaveBeenCalledTimes(2)
  expect(useTheme().state.value.effective).toBe('light')
  disposeTheme()
  expect(unsubscribe).toHaveBeenCalledTimes(2)
  delete window.__ECOMMERCE_THEME__
})

it('mounts the global toggle and releases the controller with the app', () => {
  const unsubscribe = vi.fn()
  const dispose = vi.fn()
  window.__ECOMMERCE_THEME__ = {
    start: vi.fn(), dispose, toggle: vi.fn(),
    subscribe: listener => { listener({ effective: 'light', persistence: 'untouched' }); return unsubscribe }
  }
  const wrapper = mount(App, { global: { stubs: { RouterView: true, FloatingAssistant: true } } })
  expect(wrapper.text()).toContain('当前：白天模式')
  wrapper.unmount()
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  expect(dispose).toHaveBeenCalledTimes(1)
  delete window.__ECOMMERCE_THEME__
})

it('loads the theme initializer synchronously before the application entry', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
  const initializer = html.indexOf('<script src="/theme-init.js"></script>')
  const application = html.indexOf('<script type="module" src="/src/main.js"></script>')
  expect(initializer).toBeGreaterThan(-1)
  const styles = html.indexOf('<link rel="stylesheet" href="/src/styles/theme.css">')
  expect(styles).toBeGreaterThan(initializer)
  expect(styles).toBeLessThan(application)
  expect(initializer).toBeLessThan(application)
})

it('shows the current appearance and requests a toggle on click', async () => {
  const toggle = vi.fn()
  const subscribe = vi.fn(listener => { listener(window.__ECOMMERCE_THEME__.getSnapshot()); return () => {} })
  window.__ECOMMERCE_THEME__ = {
    getSnapshot: () => ({ effective: 'light', manual: null, system: 'light', persistence: 'untouched' }),
    subscribe,
    toggle, start() {}, dispose() {}
  }
  startTheme()
  const wrapper = mount(ThemeToggle)
  expect(subscribe).toHaveBeenCalledTimes(1)
  expect(wrapper.get('button').attributes('type')).toBe('button')
  expect(wrapper.get('button').attributes('aria-label')).toBe('当前白天模式，切换到黑夜模式')
  expect(wrapper.text()).toContain('当前：白天模式')
  await wrapper.get('button').trigger('click')
  expect(toggle).toHaveBeenCalledTimes(1)
  wrapper.unmount()
  disposeTheme()
  delete window.__ECOMMERCE_THEME__
})

it('announces a failed preference save without hiding the active appearance', () => {
  window.__ECOMMERCE_THEME__ = {
    getSnapshot: () => ({ effective: 'dark', manual: 'dark', system: 'light', persistence: 'failed' }),
    subscribe: listener => { listener(window.__ECOMMERCE_THEME__.getSnapshot()); return () => {} },
    toggle() {}, start() {}, dispose() {}
  }
  startTheme()
  const wrapper = mount(ThemeToggle)
  expect(wrapper.text()).toContain('当前：黑夜模式')
  expect(wrapper.get('[aria-live="polite"]').text()).toContain('未能保存')
  wrapper.unmount()
  disposeTheme()
  delete window.__ECOMMERCE_THEME__
})
