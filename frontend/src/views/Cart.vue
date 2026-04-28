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
            <img :src="item.imageUrl" :alt="item.productName" />
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
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.cart-page { background: #fff; padding: 30px; border-radius: 8px; }
.cart-page h2 { margin-bottom: 20px; }
.cart-item { display: flex; align-items: center; padding: 20px 0; border-bottom: 1px solid #f0f0f0; }
.cart-item img { width: 80px; height: 80px; object-fit: cover; }
.item-info { flex: 1; margin-left: 20px; }
.item-info h4 { font-size: 14px; }
.price { color: #FF6700; margin-top: 5px; }
.quantity { display: flex; align-items: center; margin: 0 40px; }
.quantity button { width: 30px; height: 30px; border: 1px solid #e0e0e0; background: #fff; cursor: pointer; }
.quantity span { width: 40px; text-align: center; }
.subtotal { width: 100px; color: #FF6700; font-weight: bold; }
.btn-delete { padding: 6px 16px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer; }
.btn-delete:hover { color: #ff4d4f; border-color: #ff4d4f; }
.cart-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.total { font-size: 20px; color: #FF6700; font-weight: bold; }
.btn-checkout { padding: 12px 40px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-checkout:hover { background: #e65c00; }
.empty { text-align: center; padding: 60px 0; }
.empty p { color: #999; margin-bottom: 20px; }
.empty a { color: #FF6700; }
</style>
