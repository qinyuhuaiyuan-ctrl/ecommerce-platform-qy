<template>
  <div id="app">
    <ThemeToggle />
    <router-view />
    <FloatingAssistant />
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue'
import FloatingAssistant from './components/FloatingAssistant.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import { startTheme, disposeTheme } from './theme/index.js'

startTheme()
onUnmounted(disposeTheme)
</script>

<style>
#app {
  min-height: 100vh;
  background-color: var(--color-bg);
  color: var(--color-text);
}
</style>
