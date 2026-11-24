<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
        </nav>
      </div>
    </header>
    <div class="main container">
      <div class="order-page">
        <h2>我的订单</h2>
        <div v-if="orders.length" class="order-list">
          <div v-for="order in orders" :key="order.id" class="order-card" @click="goDetail(order.id)">
            <div class="order-header">
              <span>订单号: {{ order.id }}</span>
              <span>{{ order.createTime }}</span>
              <span class="status" :class="'status-' + order.status">{{ order.statusText }}</span>
            </div>
            <div class="order-body">
              <span>商品数量: {{ order.itemCount }}</span>
              <span class="total">¥{{ order.totalAmount }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          <p>暂无订单</p>
          <router-link to="/products">去购物</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { orderApi } from '../api'

const router = useRouter()
const orders = ref([])

const loadOrders = async () => {
  try {
    const res = await orderApi.list()
    orders.value = res.data.data
  } catch (e) {
    router.push('/login')
  }
}

const goDetail = (id) => router.push(`/order/${id}`)

onMounted(loadOrders)
</script>

<style scoped>
.layout { min-height: 100vh; padding-bottom: 96px; }
.header { min-height: 60px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.container { width: min(1200px, 100%); padding-inline: 16px; margin: 0 auto; }
.header .container { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.logo { color: var(--color-accent); font-size: 24px; cursor: pointer; }
.nav { margin-left: auto; display: flex; flex-wrap: wrap; gap: 20px; line-height: 60px; }
.nav a { color: var(--color-text); text-decoration: none; }
.main { padding-block: 40px; }
.order-page { background: var(--color-surface); padding: 30px; border-radius: 8px; }
.order-page h2 { margin-bottom: 20px; }
.order-card { padding: 20px; border: 1px solid var(--color-border); border-radius: 4px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s; }
.order-card:hover { border-color: var(--color-accent); box-shadow: var(--shadow-panel); }
.order-header { display: flex; flex-wrap: wrap; gap: 8px; overflow-wrap: anywhere; justify-content: space-between; margin-bottom: 10px; color: var(--color-text-muted); font-size: 12px; }
.order-body { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; }
.total { color: var(--color-accent); font-size: 18px; font-weight: bold; }
.status-0 { color: var(--color-warning); }
.status-1 { color: var(--color-success); }
.status-2 { color: var(--color-info); }
.status-3 { color: var(--color-success); }
.status-4 { color: var(--color-text-muted); }
.empty { text-align: center; padding: 60px 0; }
.empty p { color: var(--color-text-muted); margin-bottom: 20px; }
.empty a { color: var(--color-accent); }
@media (max-width: 768px) {
  .header .container { padding-block: 8px; }
  .nav { margin-left: 0; line-height: normal; }
  .order-page { padding: 16px; }
}
</style>
