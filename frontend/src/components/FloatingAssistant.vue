<template>
  <div class="assistant-container">
    <div v-if="isOpen" class="assistant-panel">
      <div class="assistant-header">
        <span>智能助手</span>
        <button class="btn-close" @click="isOpen = false">×</button>
      </div>
      <div class="assistant-messages" ref="msgContainer">
        <div v-for="(msg, idx) in messages" :key="idx" :class="['message', msg.role]">
          <div class="msg-content">{{ msg.content }}</div>
        </div>
        <div v-if="loading" class="message assistant">
          <div class="msg-content typing">...</div>
        </div>
      </div>
      <div class="assistant-input">
        <input
          v-model="input"
          placeholder="输入您的问题..."
          @keyup.enter="send"
          :disabled="loading"
        />
        <button @click="send" :disabled="loading || !input.trim()">发送</button>
      </div>
    </div>
    <button v-else class="assistant-bubble" @click="toggleOpen">
      <span class="bubble-icon">AI</span>
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { assistantApi } from '../api'

const isOpen = ref(false)
const input = ref('')
const loading = ref(false)
const messages = ref([])
const msgContainer = ref(null)

function toggleOpen() {
  isOpen.value = true
}

async function send() {
  const msg = input.value.trim()
  if (!msg || loading.value) return

  messages.value.push({ role: 'user', content: msg })
  input.value = ''
  loading.value = true
  await scrollToBottom()

  try {
    const res = await assistantApi.chat(msg)
    const data = res.data.data
    messages.value.push({
      role: 'assistant',
      content: data.reply,
      result: data.result
    })
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '抱歉，请求失败，请稍后重试。'
    })
  }
  loading.value = false
  await scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (msgContainer.value) {
    msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  }
}
</script>

<style scoped>
.assistant-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.assistant-bubble {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s;
}
.assistant-bubble:hover { transform: scale(1.1); }
.bubble-icon { font-weight: bold; font-size: 18px; }

.assistant-panel {
  width: 360px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.assistant-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
}
.btn-close {
  background: none; border: none; color: white;
  font-size: 22px; cursor: pointer;
}

.assistant-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f8f9fa;
}
.message { margin-bottom: 10px; }
.message.user .msg-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 12px 12px 0 12px;
  max-width: 80%;
  margin-left: auto;
}
.message.assistant .msg-content {
  background: white;
  color: #333;
  padding: 8px 12px;
  border-radius: 12px 12px 12px 0;
  max-width: 80%;
  border: 1px solid #eee;
}
.typing { color: #999; }

.assistant-input {
  display: flex; padding: 10px; border-top: 1px solid #eee; background: white;
}
.assistant-input input {
  flex: 1; padding: 8px 12px; border: 1px solid #ddd;
  border-radius: 20px; outline: none; font-size: 14px;
}
.assistant-input input:focus { border-color: #667eea; }
.assistant-input button {
  margin-left: 8px; padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; border: none; border-radius: 20px; cursor: pointer;
  font-size: 14px;
}
.assistant-input button:disabled { opacity: 0.5; cursor: default; }
</style>
