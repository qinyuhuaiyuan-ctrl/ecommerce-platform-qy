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
    <div class="main container" v-if="order">
      <div class="detail-page">
        <h2>订单详情</h2>
        <div class="info-section">
          <div class="info-row">
            <span class="label">订单号:</span>
            <span>{{ order.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">订单状态:</span>
            <span class="status" :class="'status-' + order.status">{{ order.statusText }}</span>
          </div>
          <div class="info-row">
            <span class="label">下单时间:</span>
            <span>{{ order.createTime }}</span>
          </div>
          <div v-if="order.payTime" class="info-row">
            <span class="label">支付时间:</span>
            <span>{{ order.payTime }}</span>
          </div>
        </div>
        <div class="info-section">
          <h3>收货信息</h3>
          <div class="info-row">
            <span class="label">收货人:</span>
            <span>{{ order.receiverName }}</span>
          </div>
          <div class="info-row">
            <span class="label">联系电话:</span>
            <span>{{ order.receiverPhone }}</span>
          </div>
          <div class="info-row">
            <span class="label">收货地址:</span>
            <span>{{ order.receiverAddress }}</span>
          </div>
        </div>
        <div class="info-section">
          <h3>商品清单</h3>
          <div class="item-list">
            <div v-for="(item, index) in order.items" :key="index" class="item">
              <span>{{ item.productName }}</span>
              <span>¥{{ item.price }} x {{ item.quantity }}</span>
              <span class="price">¥{{ item.subtotal }}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p class="total">实付: ¥{{ order.totalAmount }}</p>
          <div class="actions">
            <button v-if="order.status === 0" class="btn-pay" @click="payOrder">立即支付</button>
            <button v-if="order.status === 0" class="btn-cancel" @click="cancelOrder">取消订单</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orderApi } from '../api'

const route = useRoute()
const router = useRouter()
const order = ref(null)

const loadOrder = async () => {
  const res = await orderApi.getById(route.params.id)
  order.value = res.data.data
}

const payOrder = async () => {
  await orderApi.pay(order.value.id)
  alert('支付成功')
  loadOrder()
}

const cancelOrder = async () => {
  if (confirm('确定要取消订单吗？')) {
    await orderApi.cancel(order.value.id)
    alert('订单已取消')
    loadOrder()
  }
}

onMounted(loadOrder)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.detail-page { background: #fff; padding: 30px; border-radius: 8px; }
.detail-page h2 { margin-bottom: 30px; }
.info-section { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0; }
.info-section h3 { margin-bottom: 15px; font-size: 16px; }
.info-row { display: flex; margin-bottom: 10px; }
.label { width: 80px; color: #999; }
.status-0 { color: #faad14; }
.status-1 { color: #52c41a; }
.status-2 { color: #1890ff; }
.status-3 { color: #52c41a; }
.status-4 { color: #999; }
.item-list { border: 1px solid #f0f0f0; border-radius: 4px; }
.item { display: flex; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.item span { flex: 1; }
.item .price { text-align: right; color: #FF6700; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
.total { font-size: 24px; color: #FF6700; font-weight: bold; }
.actions { display: flex; gap: 10px; }
.btn-pay { padding: 12px 30px; background: #FF6700; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-cancel { padding: 12px 30px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer; }
</style>
