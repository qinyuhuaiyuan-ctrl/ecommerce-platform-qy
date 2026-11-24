<template>
  <div class="register-page">
    <div class="register-box">
      <h2>注册</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <input v-model="form.username" placeholder="用户名" required />
        </div>
        <div class="form-group">
          <input v-model="form.password" type="password" placeholder="密码" required />
        </div>
        <div class="form-group">
          <input v-model="form.phone" placeholder="手机号" required />
        </div>
        <button type="submit" class="btn-primary">注册</button>
        <p class="link-text">
          已有账号？<router-link to="/login">立即登录</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '../api'

const router = useRouter()
const form = reactive({ username: '', password: '', phone: '' })

const handleRegister = async () => {
  try {
    await userApi.register(form)
    alert('注册成功，请登录')
    router.push('/login')
  } catch (e) {
    alert(e.response?.data?.message || '注册失败')
  }
}
</script>

<style scoped>
.register-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding-bottom: 96px; background: var(--color-bg); }
.register-box { width: min(360px, calc(100% - 32px)); padding: 40px; background: var(--color-surface); color: var(--color-text); border-radius: 8px; box-shadow: var(--shadow-panel); }
h2 { text-align: center; margin-bottom: 30px; color: var(--color-accent); }
.form-group { margin-bottom: 20px; }
input { width: 100%; height: 40px; padding: 0 12px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-size: 14px; }
input::placeholder { color: var(--color-text-muted); }
input:focus { outline: 2px solid var(--color-focus); outline-offset: 1px; }
.btn-primary { width: 100%; height: 44px; background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-primary:hover { background: var(--color-primary-hover); }
.link-text { text-align: center; margin-top: 20px; color: var(--color-text-muted); }
.link-text a { color: var(--color-accent); }
</style>
