import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'

const script = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8')

describe('early browser theme (R-003)', () => {
  it('uses the dark system appearance before the application mounts (S-006)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({
        media: query, matches: query === '(prefers-color-scheme: dark)',
        addEventListener() {}, removeEventListener() {}
      })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      expect(browser.window.document.documentElement.style.colorScheme).toBe('dark')
      expect(browser.window.document.querySelector('#app').childElementCount).toBe(0)
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBeNull()
    } finally {
      browser.window.close()
    }
  })

  it('uses the light system appearance before the application mounts (S-006)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({
        media: query, matches: query === '(prefers-color-scheme: light)',
        addEventListener() {}, removeEventListener() {}
      })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
      expect(browser.window.document.documentElement.style.colorScheme).toBe('light')
      expect(browser.window.document.querySelector('#app').childElementCount).toBe(0)
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBeNull()
    } finally {
      browser.window.close()
    }
  })

  it('uses a saved dark choice when the system is light (S-012)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.localStorage.setItem('ecommerce.display.theme.v1', 'dark')
      browser.window.matchMedia = query => ({
        media: query, matches: query === '(prefers-color-scheme: light)',
        addEventListener() {}, removeEventListener() {}
      })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      expect(browser.window.document.documentElement.style.colorScheme).toBe('dark')
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('uses a saved light choice when the system is dark (S-012)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.localStorage.setItem('ecommerce.display.theme.v1', 'light')
      browser.window.matchMedia = query => ({
        media: query, matches: query === '(prefers-color-scheme: dark)',
        addEventListener() {}, removeEventListener() {}
      })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
      expect(browser.window.document.documentElement.style.colorScheme).toBe('light')
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBe('light')
    } finally {
      browser.window.close()
    }
  })

  it('uses light on first visit when system appearance is unknown (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({
        media: query, matches: false,
        addEventListener() {}, removeEventListener() {}
      })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
      expect(browser.window.document.documentElement.style.colorScheme).toBe('light')
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBeNull()
    } finally {
      browser.window.close()
    }
  })

  it('follows the system when reading the preference fails (S-019)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      Object.defineProperty(browser.window, 'localStorage', { get() { throw new Error('blocked') } })
      browser.window.matchMedia = query => ({
        media: query, matches: query === '(prefers-color-scheme: dark)',
        addEventListener() {}, removeEventListener() {}
      })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('uses light when the system appearance API is unavailable (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
    } finally {
      browser.window.close()
    }
  })

  it('uses light when both system queries match and no preference exists (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: true })
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
    } finally {
      browser.window.close()
    }
  })

  it('uses light when detecting system appearance throws (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = () => { throw new Error('unavailable') }
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
    } finally {
      browser.window.close()
    }
  })

  it('exposes the initial effective and system appearance as a snapshot (S-006)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark') })
      browser.window.eval(script)
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot()).toEqual({
        effective: 'dark', manual: null, system: 'dark', persistence: 'untouched'
      })
    } finally {
      browser.window.close()
    }
  })

  it('switches the current appearance and saves the manual choice (S-004)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light') })
      browser.window.eval(script)
      browser.window.__ECOMMERCE_THEME__.toggle()
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBe('dark')
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot()).toEqual({
        effective: 'dark', manual: 'dark', system: 'light', persistence: 'saved'
      })
    } finally {
      browser.window.close()
    }
  })

  it('keeps the manually selected appearance when saving fails (S-020)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light') })
      browser.window.eval(script)
      Object.defineProperty(browser.window, 'localStorage', { get() { throw new Error('blocked') } })
      expect(() => browser.window.__ECOMMERCE_THEME__.toggle()).not.toThrow()
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot()).toEqual({
        effective: 'dark', manual: 'dark', system: 'light', persistence: 'failed'
      })
    } finally {
      browser.window.close()
    }
  })

  it('notifies subscribers immediately and on change until unsubscribed (S-004)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light') })
      browser.window.eval(script)
      const controller = browser.window.__ECOMMERCE_THEME__
      const states = []
      const unsubscribe = controller.subscribe(state => states.push(state.effective))
      controller.toggle()
      unsubscribe()
      controller.toggle()
      expect(states).toEqual(['light', 'dark', 'dark'])
    } finally {
      browser.window.close()
    }
  })

  it('follows a system change without creating a preference (S-007)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      const queries = {
        dark: { matches: false, addEventListener(type, listener) { this.listener = listener } },
        light: { matches: true, addEventListener(type, listener) { this.listener = listener } }
      }
      browser.window.matchMedia = query => query.includes('dark') ? queries.dark : queries.light
      browser.window.eval(script)
      queries.dark.matches = true
      queries.light.matches = false
      queries.dark.listener({ matches: true })
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      expect(browser.window.localStorage.getItem('ecommerce.display.theme.v1')).toBeNull()
    } finally {
      browser.window.close()
    }
  })

  it('does not let a system change override a manual choice (S-009)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      const queries = {
        dark: { matches: false, addEventListener(type, listener) { this.listener = listener } },
        light: { matches: true, addEventListener(type, listener) { this.listener = listener } }
      }
      browser.window.matchMedia = query => query.includes('dark') ? queries.dark : queries.light
      browser.window.eval(script)
      browser.window.__ECOMMERCE_THEME__.toggle()
      queries.dark.matches = true
      queries.light.matches = false
      queries.dark.listener()
      queries.dark.matches = false
      queries.light.matches = true
      queries.light.listener()
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().manual).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('does not duplicate listeners on start and releases them on dispose (S-007)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      const queries = ['dark', 'light'].map((name, i) => ({
        matches: i === 1,
        listeners: new Set(),
        addEventListener(type, listener) { this.listeners.add(listener) },
        removeEventListener(type, listener) { this.listeners.delete(listener) }
      }))
      browser.window.matchMedia = query => queries[query.includes('dark') ? 0 : 1]
      browser.window.eval(script)
      const controller = browser.window.__ECOMMERCE_THEME__
      controller.start()
      controller.start()
      expect(queries.map(query => query.listeners.size)).toEqual([1, 1])
      controller.dispose()
      controller.dispose()
      expect(queries.map(query => query.listeners.size)).toEqual([0, 0])
    } finally {
      browser.window.close()
    }
  })

  it('reuses the existing controller when the script runs twice (S-011)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light') })
      browser.window.eval(script)
      const original = browser.window.__ECOMMERCE_THEME__
      original.toggle()
      browser.window.eval(script)
      expect(browser.window.__ECOMMERCE_THEME__).toBe(original)
      expect(original.getSnapshot().manual).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('renders the system theme even when listener registration throws (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({
        matches: query.includes('dark'),
        addEventListener() { throw new Error('listener unavailable') }
      })
      expect(() => browser.window.eval(script)).not.toThrow()
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('follows and detaches legacy media listeners (S-007)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      const queries = [false, true].map(matches => ({
        matches, listeners: new Set(),
        addListener(listener) { this.listeners.add(listener) },
        removeListener(listener) { this.listeners.delete(listener) }
      }))
      browser.window.matchMedia = query => queries[query.includes('dark') ? 0 : 1]
      browser.window.eval(script)
      expect(queries.map(query => query.listeners.size)).toEqual([1, 1])
      queries[0].matches = true
      queries[1].matches = false
      for (const listener of queries[0].listeners) listener()
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
      browser.window.__ECOMMERCE_THEME__.dispose()
      expect(queries.map(query => query.listeners.size)).toEqual([0, 0])
    } finally {
      browser.window.close()
    }
  })

  it('redetects recovered system appearance on focus (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.eval(script)
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
      browser.window.matchMedia = query => ({
        media: query, matches: query.includes('dark'), addEventListener() {}, removeEventListener() {}
      })
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('continues following media changes after focus recovery (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.eval(script)
      const queries = [true, false].map(matches => ({
        matches, listeners: new Set(),
        addEventListener(type, listener) { this.listeners.add(listener) },
        removeEventListener(type, listener) { this.listeners.delete(listener) }
      }))
      browser.window.matchMedia = query => queries[query.includes('dark') ? 0 : 1]
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(queries.map(query => query.listeners.size)).toEqual([1, 1])
      queries[0].matches = false
      queries[1].matches = true
      for (const listener of queries[1].listeners) listener()
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
    } finally {
      browser.window.close()
    }
  })

  it('redetects recovered system appearance on pageshow (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.eval(script)
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark') })
      browser.window.dispatchEvent(new browser.window.Event('pageshow'))
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('redetects recovered appearance when the document becomes visible (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.eval(script)
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark') })
      Object.defineProperty(browser.window.document, 'visibilityState', { value: 'visible', configurable: true })
      browser.window.document.dispatchEvent(new browser.window.Event('visibilitychange'))
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally {
      browser.window.close()
    }
  })

  it('treats unsupported media queries as unknown on first visit (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://shop.test', runScripts: 'outside-only'
    })
    try {
      browser.window.matchMedia = query => ({ media: 'not all', matches: query.includes('dark') })
      browser.window.eval(script)
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().system).toBe('unknown')
      expect(browser.window.document.documentElement.dataset.theme).toBe('light')
    } finally {
      browser.window.close()
    }
  })

  it('safely releases an invalid media query result (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.matchMedia = () => null
      browser.window.eval(script)
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().system).toBe('unknown')
      expect(() => browser.window.__ECOMMERCE_THEME__.dispose()).not.toThrow()
    } finally { browser.window.close() }
  })

  it('retains the last appearance and reports unknown when recovery becomes unsupported (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark') })
      browser.window.eval(script)
      browser.window.matchMedia = query => ({ media: 'not all', matches: query.includes('light') })
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().system).toBe('unknown')
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally { browser.window.close() }
  })

  it('updates the recovered appearance even when listener registration fails (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.eval(script)
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark'), addEventListener() { throw new Error('blocked') } })
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally { browser.window.close() }
  })

  it('applies a valid recovery reading when removing a prior listener throws (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light'), addEventListener() {}, removeEventListener() { throw new Error('blocked') } })
      browser.window.eval(script)
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark'), addEventListener() {}, removeEventListener() {} })
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally { browser.window.close() }
  })

  it('treats throwing media query properties as unknown without aborting startup (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.matchMedia = () => ({ get matches() { throw new Error('unavailable') } })
      expect(() => browser.window.eval(script)).not.toThrow()
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().system).toBe('unknown')
    } finally { browser.window.close() }
  })

  it('notifies the applied manual choice before attempting storage (S-010)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.eval(script)
      const events = []
      browser.window.__ECOMMERCE_THEME__.subscribe(s => events.push(`notify:${s.effective}:${s.persistence}`))
      vi.spyOn(browser.window.Storage.prototype, 'setItem').mockImplementation(() => events.push('write'))
      events.length = 0
      browser.window.__ECOMMERCE_THEME__.toggle()
      expect(events[0]).toBe('notify:dark:untouched')
      expect(events).toContain('write')
      expect(events.at(-1)).toBe('notify:dark:saved')
    } finally { vi.restoreAllMocks(); browser.window.close() }
  })

  it('reports unknown on recovery when both media queries stop matching (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark') })
      browser.window.eval(script)
      browser.window.matchMedia = query => ({ media: query, matches: false })
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().system).toBe('unknown')
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally { browser.window.close() }
  })

  it('restores failed registrations on a later focus without duplicating listeners', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      let allow = false
      const active = new Set()
      const queries = ['dark', 'light'].map(mode => ({ media: `(prefers-color-scheme: ${mode})`, matches: mode === 'light', addEventListener(_, cb) { if (!allow) throw new Error('blocked'); active.add(cb) }, removeEventListener(_, cb) { active.delete(cb) } }))
      browser.window.matchMedia = q => queries[q.includes('dark') ? 0 : 1]
      browser.window.eval(script)
      expect(active.size).toBe(0)
      allow = true
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(active.size).toBe(2)
      browser.window.__ECOMMERCE_THEME__.dispose()
      expect(active.size).toBe(0)
    } finally { browser.window.close() }
  })

  it('keeps one active listener per query across recovery, dispose and restart', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      const active = new Set()
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light'), addEventListener(_, cb) { active.add(cb) }, removeEventListener(_, cb) { active.delete(cb) } })
      browser.window.eval(script)
      const controller = browser.window.__ECOMMERCE_THEME__
      expect(active.size).toBe(2)
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      browser.window.dispatchEvent(new browser.window.Event('pageshow'))
      controller.start()
      expect(active.size).toBe(2)
      controller.dispose()
      expect(active.size).toBe(0)
      controller.start()
      expect(active.size).toBe(2)
      controller.dispose()
      expect(active.size).toBe(0)
    } finally { browser.window.close() }
  })

  it('retries a failed media listener removal when disposed again', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      const active = new Set()
      let allowRemove = false
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light'), addEventListener(_, cb) { active.add(cb) }, removeEventListener(_, cb) { if (!allowRemove) throw new Error('blocked'); active.delete(cb) } })
      browser.window.eval(script)
      const controller = browser.window.__ECOMMERCE_THEME__
      controller.dispose()
      expect(active.size).toBe(2)
      allowRemove = true
      controller.dispose()
      expect(active.size).toBe(0)
    } finally { browser.window.close() }
  })

  it('ignores stale media events after recovery even if listener removal fails', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      const oldListeners = []
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('light'), addEventListener(_, cb) { oldListeners.push(cb) }, removeEventListener() { throw new Error('blocked') } })
      browser.window.eval(script)
      const controller = browser.window.__ECOMMERCE_THEME__
      const seen = []
      controller.subscribe(s => seen.push(s.effective))
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark'), addEventListener() {}, removeEventListener() {} })
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      seen.length = 0
      oldListeners.forEach(callback => callback())
      expect(seen).toEqual([])
      expect(controller.getSnapshot().effective).toBe('dark')
    } finally { browser.window.close() }
  })

  it('reports unknown when recovery detection throws while preserving appearance (S-018)', () => {
    const browser = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://shop.test', runScripts: 'outside-only' })
    try {
      browser.window.matchMedia = query => ({ media: query, matches: query.includes('dark') })
      browser.window.eval(script)
      browser.window.matchMedia = () => { throw new Error('unavailable') }
      browser.window.dispatchEvent(new browser.window.Event('focus'))
      expect(browser.window.__ECOMMERCE_THEME__.getSnapshot().system).toBe('unknown')
      expect(browser.window.document.documentElement.dataset.theme).toBe('dark')
    } finally { browser.window.close() }
  })
})
