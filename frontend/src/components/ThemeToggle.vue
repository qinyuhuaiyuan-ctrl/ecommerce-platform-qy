<template>
  <div class="theme-toolbar">
    <button type="button" :aria-label="state.effective === 'dark' ? '当前黑夜模式，切换到白天模式' : '当前白天模式，切换到黑夜模式'" :title="state.effective === 'dark' ? '当前黑夜模式，切换到白天模式' : '当前白天模式，切换到黑夜模式'" @click="toggle()">当前：{{ state.effective === 'dark' ? '黑夜' : '白天' }}模式</button>
    <span aria-live="polite">{{ state.persistence === 'failed' ? '本次浏览有效，未能保存' : '' }}</span>
  </div>
</template>

<script setup>
import { useTheme } from '../theme/index.js'

const { state, toggle } = useTheme()
</script>

<style scoped>
.theme-toolbar {
  position: sticky;
  top: 0;
  z-index: 1100;
  min-height: 48px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
  background: var(--color-surface);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}
button {
  min-height: 40px;
  padding: 0 12px;
  color: var(--color-text);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}
button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
</style>
