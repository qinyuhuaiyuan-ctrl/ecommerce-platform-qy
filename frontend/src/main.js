import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { disposeTheme } from './theme/index.js'

createApp(App).use(router).mount('#app')
if (import.meta.hot) import.meta.hot.dispose(disposeTheme)
