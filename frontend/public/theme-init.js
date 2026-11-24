// Initialize the appearance before the application mounts.
;(() => {
  if (window.__ECOMMERCE_THEME__) {
    window.__ECOMMERCE_THEME__.start()
    return
  }
  let dark = { matches: false }
  let light = { matches: false }
  try {
    if (typeof window.matchMedia === 'function') {
      dark = window.matchMedia('(prefers-color-scheme: dark)')
      light = window.matchMedia('(prefers-color-scheme: light)')
    }
  } catch {
    dark = { matches: false }
    light = { matches: false }
  }
  let saved = null
  try {
    saved = window.localStorage.getItem('ecommerce.display.theme.v1')
  } catch {
    // Unavailable browser storage behaves like an absent preference.
  }
  const detectSystem = () => {
    try {
      return !dark || !light || dark.media === 'not all' || light.media === 'not all' ||
        typeof dark.matches !== 'boolean' || typeof light.matches !== 'boolean' || dark.matches === light.matches
        ? 'unknown' : dark.matches ? 'dark' : 'light'
    } catch {
      return 'unknown'
    }
  }
  let system = detectSystem()
  let theme = saved === 'dark' || saved === 'light' ? saved : system === 'unknown' ? 'light' : system
  let manual = saved === 'dark' || saved === 'light' ? saved : null
  let persistence = 'untouched'
  const apply = () => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }
  const listeners = new Set()
  const snapshot = () => Object.freeze({ effective: theme, manual, system, persistence })
  let started = false
  let generation = 0
  let bindings = []
  const unbindMedia = () => {
    generation++
    bindings = bindings.filter(({ query, callback, legacy }) => {
      try {
        if (legacy) query.removeListener(callback)
        else query.removeEventListener('change', callback)
        return false
      } catch { return true }
    })
  }
  const bindMedia = () => {
    const activeGeneration = generation
    for (const query of [dark, light]) {
      try {
        const callback = () => { if (started && generation === activeGeneration) onSystemChange() }
        if (typeof query?.addEventListener === 'function') {
          bindings.push({ query, callback, legacy: false })
          query.addEventListener('change', callback)
        } else if (typeof query?.addListener === 'function') {
          bindings.push({ query, callback, legacy: true })
          query.addListener(callback)
        }
      } catch { /* Keep the reading even when a listener is unavailable. */ }
    }
  }
  window.__ECOMMERCE_THEME__ = {
    getSnapshot: snapshot,
    start: () => {
      if (started) return
      started = true
      window.addEventListener('focus', onFocus)
      window.addEventListener('pageshow', onFocus)
      document.addEventListener('visibilitychange', onVisible)
      unbindMedia()
      bindMedia()
    },
    dispose: () => {
      if (!started) {
        unbindMedia()
        return
      }
      started = false
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      unbindMedia()
      listeners.clear()
    },
    subscribe: listener => {
      listeners.add(listener)
      listener(snapshot())
      return () => listeners.delete(listener)
    },
    toggle: () => {
      theme = theme === 'light' ? 'dark' : 'light'
      manual = theme
      apply()
      listeners.forEach(listener => listener(snapshot()))
      try {
        window.localStorage.setItem('ecommerce.display.theme.v1', theme)
        persistence = 'saved'
      } catch {
        persistence = 'failed'
      }
      listeners.forEach(listener => listener(snapshot()))
    }
  }
  apply()
  const onSystemChange = () => {
    system = detectSystem()
    if (manual === null && system !== 'unknown') {
      theme = system
      apply()
    }
    listeners.forEach(listener => listener(snapshot()))
  }
  const onFocus = () => {
    try {
      if (typeof window.matchMedia !== 'function') throw new Error('Media queries unavailable')
      const nextDark = window.matchMedia('(prefers-color-scheme: dark)')
      const nextLight = window.matchMedia('(prefers-color-scheme: light)')
      unbindMedia()
      dark = nextDark
      light = nextLight
      bindMedia()
      onSystemChange()
    } catch {
      system = 'unknown'
      listeners.forEach(listener => listener(snapshot()))
      // Keep the last effective appearance until the browser can report one.
    }
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') onFocus()
  }
  window.__ECOMMERCE_THEME__.start()
})()
