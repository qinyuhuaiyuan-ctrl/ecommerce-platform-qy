import { readonly, shallowRef } from 'vue'

const state = shallowRef(null)
let unsubscribe = null
let activeController = null

export function startTheme() {
  if (unsubscribe) return
  activeController = window.__ECOMMERCE_THEME__
  activeController.start()
  unsubscribe = activeController.subscribe(snapshot => { state.value = snapshot })
}

export function disposeTheme() {
  if (!unsubscribe) return
  unsubscribe()
  unsubscribe = null
  activeController.dispose()
  activeController = null
}

export function useTheme() {
  return { state: readonly(state), toggle: () => activeController.toggle() }
}

if (import.meta.hot) import.meta.hot.dispose(disposeTheme)
