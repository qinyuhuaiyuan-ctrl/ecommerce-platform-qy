<template>
  <div id="app">
    <router-view />
    <FloatingAssistant />
  </div>
</template>

<script setup>
import FloatingAssistant from './components/FloatingAssistant.vue'
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
