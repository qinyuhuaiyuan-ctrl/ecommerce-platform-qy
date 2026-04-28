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
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; }
.nav { float: right; display: flex; gap: 20px; line-height: 60px; }
.nav a { color: #333; text-decoration: none; }
.main { padding: 40px 0; }
.product-detail { display: flex; gap: 40px; background: #fff; padding: 40px; border-radius: 8px; }
.product-img { width: 400px; height: 400px; object-fit: cover; }
.product-info { flex: 1; }
.product-info h2 { font-size: 24px; margin-bottom: 20px; }
.desc { color: #666; margin-bottom: 20px; }
.price { color: #FF6700; font-size: 32px; font-weight: bold; margin-bottom: 15px; }
.stock { color: #999; margin-bottom: 30px; }
.actions { display: flex; gap: 20px; }
.quantity { display: flex; align-items: center; border: 1px solid #e0e0e0; }
.quantity button { width: 40px; height: 40px; border: none; background: #f5f5f5; cursor: pointer; }
.quantity span { width: 60px; text-align: center; }
.btn-add { padding: 12px 40px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-add:hover { background: #e65c00; }
</style>
