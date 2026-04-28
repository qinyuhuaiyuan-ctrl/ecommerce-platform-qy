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
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.order-page { background: #fff; padding: 30px; border-radius: 8px; }
.order-page h2 { margin-bottom: 20px; }
.order-card { padding: 20px; border: 1px solid #f0f0f0; border-radius: 4px; margin-bottom: 15px; cursor: pointer; transition: all 0.2s; }
.order-card:hover { border-color: #FF6700; box-shadow: 0 2px 8px rgba(255,103,0,0.1); }
.order-header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #999; font-size: 12px; }
.order-body { display: flex; justify-content: space-between; }
.total { color: #FF6700; font-size: 18px; font-weight: bold; }
.status-0 { color: #faad14; }
.status-1 { color: #52c41a; }
.status-2 { color: #1890ff; }
.status-3 { color: #52c41a; }
.status-4 { color: #999; }
.empty { text-align: center; padding: 60px 0; }
.empty p { color: #999; margin-bottom: 20px; }
.empty a { color: #FF6700; }
</style>
