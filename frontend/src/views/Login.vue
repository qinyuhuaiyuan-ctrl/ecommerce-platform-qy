<template>
  <div class="login-page">
    <div class="login-box">
      <h2>登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <input v-model="form.username" placeholder="用户名" required />
        </div>
        <div class="form-group">
          <input v-model="form.password" type="password" placeholder="密码" required />
        </div>
        <button type="submit" class="btn-primary">登录</button>
        <p class="link-text">
          还没有账号？<router-link to="/register">立即注册</router-link>
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
const form = reactive({ username: '', password: '' })

const handleLogin = async () => {
  try {
    const res = await userApi.login(form)
    localStorage.setItem('userId', res.data.data.userId)
    localStorage.setItem('username', res.data.data.username)
    router.push('/products')
  } catch (e) {
    alert(e.response?.data?.message || '登录失败')
  }
}
</script>

<style scoped>
.login-page { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
.login-box { width: 360px; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
h2 { text-align: center; margin-bottom: 30px; color: #FF6700; }
.form-group { margin-bottom: 20px; }
input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; }
input:focus { outline: none; border-color: #FF6700; }
.btn-primary { width: 100%; height: 44px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-primary:hover { background: #e65c00; }
.link-text { text-align: center; margin-top: 20px; color: #999; }
.link-text a { color: #FF6700; }
</style>
