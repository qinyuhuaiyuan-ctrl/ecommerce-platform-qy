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
    <div class="main container" v-if="product">
      <div class="product-detail">
        <img :src="product.imageUrl" :alt="product.name" class="product-img" />
        <div class="product-info">
          <h2>{{ product.name }}</h2>
          <p class="desc">{{ product.description }}</p>
          <p class="price">¥{{ product.price }}</p>
          <p class="stock">库存: {{ product.stock }}</p>
          <div class="actions">
            <div class="quantity">
              <button @click="quantity > 1 && quantity--">-</button>
              <span>{{ quantity }}</span>
              <button @click="quantity < product.stock && quantity++">+</button>
            </div>
            <button class="btn-add" @click="addToCart">加入购物车</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productApi, cartApi } from '../api'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const quantity = ref(1)

const loadProduct = async () => {
  const res = await productApi.getById(route.params.id)
  product.value = res.data.data
}

const addToCart = async () => {
  try {
    await cartApi.add(product.value.id, quantity.value)
    alert('已加入购物车')
  } catch (e) {
    alert('请先登录')
    router.push('/login')
  }
}

onMounted(loadProduct)
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
.product-detail { display: flex; gap: 40px; background: var(--color-surface); padding: 40px; border-radius: 8px; }
.product-img { width: 400px; max-width: 100%; height: 400px; object-fit: cover; }
.product-info { flex: 1; min-width: 0; }
.product-info h2 { font-size: 24px; margin-bottom: 20px; }
.desc { color: var(--color-text-muted); margin-bottom: 20px; }
.price { color: var(--color-accent); font-size: 32px; font-weight: bold; margin-bottom: 15px; }
.stock { color: var(--color-text-muted); margin-bottom: 30px; }
.actions { display: flex; flex-wrap: wrap; gap: 20px; }
.quantity { display: flex; align-items: center; border: 1px solid var(--color-border); }
.quantity button { width: 40px; height: 40px; border: none; color: var(--color-text); background: var(--color-surface-muted); cursor: pointer; }
.quantity span { width: 60px; text-align: center; }
.btn-add { padding: 12px 40px; background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-add:hover { background: var(--color-primary-hover); }
@media (max-width: 768px) {
  .header .container { padding-block: 8px; }
  .nav { margin-left: 0; line-height: normal; }
  .product-detail { flex-direction: column; padding: 16px; gap: 20px; }
  .product-img { height: auto; }
}
</style>
