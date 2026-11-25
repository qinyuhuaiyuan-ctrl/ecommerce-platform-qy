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
      <div class="cart-page">
        <h2>购物车</h2>
        <div v-if="cartItems.length" class="cart-list">
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <ProductImage :src="item.imageUrl" :alt="item.productName" :width="80" :height="80" class="cart-image" />
            <div class="item-info">
              <h4>{{ item.productName }}</h4>
              <p class="price">¥{{ item.price }}</p>
            </div>
            <div class="quantity">
              <button @click="updateQuantity(item.id, item.quantity - 1)">-</button>
              <span>{{ item.quantity }}</span>
              <button @click="updateQuantity(item.id, item.quantity + 1)">+</button>
            </div>
            <p class="subtotal">¥{{ item.subtotal }}</p>
            <button class="btn-delete" @click="deleteItem(item.id)">删除</button>
          </div>
          <div class="cart-footer">
            <p class="total">总计: ¥{{ total }}</p>
            <button class="btn-checkout" @click="goConfirm">去结算</button>
          </div>
        </div>
        <div v-else class="empty">
          <p>购物车是空的</p>
          <router-link to="/products">去购物</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cartApi } from '../api'
import ProductImage from '../components/ProductImage.vue'

const router = useRouter()
const cartItems = ref([])

const total = computed(() => cartItems.value.reduce((sum, item) => sum + item.subtotal, 0))

const loadCart = async () => {
  try {
    const res = await cartApi.list()
    cartItems.value = res.data.data
  } catch (e) {
    router.push('/login')
  }
}

const updateQuantity = async (id, quantity) => {
  if (quantity < 1) return
  await cartApi.updateQuantity(id, quantity)
  loadCart()
}

const deleteItem = async (id) => {
  await cartApi.delete(id)
  loadCart()
}

const goConfirm = () => {
  router.push('/order/confirm')
}

onMounted(loadCart)
</script>

<style scoped>
.layout { min-height: 100vh; padding-bottom: 96px; }
.header { min-height: 60px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.container { width: min(1200px, 100%); padding-inline: 16px; margin: 0 auto; }
.header .container { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.logo { color: var(--color-accent); font-size: 24px; cursor: pointer; }
.nav { margin-left: auto; display: flex; flex-wrap: wrap; gap: 20px; line-height: 60px; }
.nav a { color: var(--color-text); text-decoration: none; }
.main { padding-block: 40px; }
.cart-page { background: var(--color-surface); padding: 30px; border-radius: 8px; }
.cart-page h2 { margin-bottom: 20px; }
.cart-item { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 20px 0; border-bottom: 1px solid var(--color-border); }
.cart-item .cart-image { width: 80px; height: 80px; object-fit: cover; }
.item-info { flex: 1; min-width: 120px; }
.item-info h4 { font-size: 14px; }
.price { color: var(--color-accent); margin-top: 5px; }
.quantity { display: flex; align-items: center; }
.quantity button { width: 30px; height: 30px; color: var(--color-text); border: 1px solid var(--color-border); background: var(--color-surface-muted); cursor: pointer; }
.quantity span { width: 40px; text-align: center; }
.subtotal { width: 100px; color: var(--color-accent); font-weight: bold; }
.btn-delete { padding: 6px 16px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; }
.btn-delete:hover { color: var(--color-danger); border-color: var(--color-danger); }
.cart-footer { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; margin-top: 20px; }
.total { font-size: 20px; color: var(--color-accent); font-weight: bold; }
.btn-checkout { padding: 12px 40px; background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-checkout:hover { background: var(--color-primary-hover); }
.empty { text-align: center; padding: 60px 0; }
.empty p { color: var(--color-text-muted); margin-bottom: 20px; }
.empty a { color: var(--color-accent); }
@media (max-width: 768px) {
  .header .container { padding-block: 8px; }
  .nav { margin-left: 0; line-height: normal; }
  .cart-page { padding: 16px; }
}
</style>
