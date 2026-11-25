<template>
  <img
    v-if="image.kind === 'ready'"
    class="product-image"
    :src="image.src"
    :alt="alt"
    :width="width"
    :height="height"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <div v-else class="product-image product-image--missing" role="img" :aria-label="placeholderLabel">
    <span class="placeholder-icon" aria-hidden="true">▧</span>
    <span class="placeholder-text">暂无图片</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { resolveProductImage } from '../utils/imageSource.js'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  width: { type: [String, Number], default: 300 },
  height: { type: [String, Number], default: 200 }
})

const missing = reason => ({ kind: 'missing', reason })

const failed = ref(false)
const image = computed(() => (failed.value ? missing('error') : resolveProductImage(props.src)))
const placeholderLabel = computed(() => (props.alt ? `${props.alt}：暂无图片` : '暂无图片'))

watch(
  () => props.src,
  () => { failed.value = false }
)
</script>

<style scoped>
.product-image { display: block; }
.product-image--missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  padding: 4px;
  overflow: hidden;
  text-align: center;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}
.placeholder-icon { font-size: 24px; line-height: 1; }
.placeholder-text { font-size: 12px; }
</style>
