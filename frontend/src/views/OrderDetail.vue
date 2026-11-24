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
.layout { min-height: 100vh; padding-bottom: 96px; }
.header { min-height: 60px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.container { width: min(1200px, 100%); padding-inline: 16px; margin: 0 auto; }
.header .container { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.logo { color: var(--color-accent); font-size: 24px; cursor: pointer; }
.nav { margin-left: auto; display: flex; flex-wrap: wrap; gap: 20px; line-height: 60px; }
.nav a { color: var(--color-text); text-decoration: none; }
.main { padding-block: 40px; }
.detail-page { background: var(--color-surface); padding: 30px; border-radius: 8px; }
.detail-page h2 { margin-bottom: 30px; }
.info-section { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
.info-section h3 { margin-bottom: 15px; font-size: 16px; }
.info-row { display: flex; flex-wrap: wrap; overflow-wrap: anywhere; margin-bottom: 10px; }
.label { width: 80px; color: var(--color-text-muted); }
.status-0 { color: var(--color-warning); }
.status-1 { color: var(--color-success); }
.status-2 { color: var(--color-info); }
.status-3 { color: var(--color-success); }
.status-4 { color: var(--color-text-muted); }
.item-list { border: 1px solid var(--color-border); border-radius: 4px; }
.item { display: flex; flex-wrap: wrap; gap: 8px; overflow-wrap: anywhere; padding: 15px; border-bottom: 1px solid var(--color-border); }
.item span { flex: 1; min-width: 80px; }
.item .price { text-align: right; color: var(--color-accent); }
.footer { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin-top: 30px; }
.total { font-size: 24px; color: var(--color-accent); font-weight: bold; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
.btn-pay { padding: 12px 30px; background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: 4px; cursor: pointer; }
.btn-pay:hover { background: var(--color-primary-hover); }
.btn-cancel { padding: 12px 30px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; }
@media (max-width: 768px) {
  .header .container { padding-block: 8px; }
  .nav { margin-left: 0; line-height: normal; }
  .detail-page { padding: 16px; }
}
</style>
