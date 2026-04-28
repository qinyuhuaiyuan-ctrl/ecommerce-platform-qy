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
.register-page { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
.register-box { width: 360px; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
h2 { text-align: center; margin-bottom: 30px; color: #FF6700; }
.form-group { margin-bottom: 20px; }
input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 14px; }
input:focus { outline: none; border-color: #FF6700; }
.btn-primary { width: 100%; height: 44px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-primary:hover { background: #e65c00; }
.link-text { text-align: center; margin-top: 20px; color: #999; }
.link-text a { color: #FF6700; }
</style>
