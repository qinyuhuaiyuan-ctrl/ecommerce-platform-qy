<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo">电商平台</h1>
        <nav class="nav">
          <router-link to="/products">商品列表</router-link>
          <router-link to="/cart">购物车</router-link>
          <router-link to="/orders">我的订单</router-link>
          <span class="username">{{ username }}</span>
          <a href="#" @click.prevent="logout">退出</a>
        </nav>
      </div>
    </header>
    <div class="main container">
      <aside class="sidebar">
        <h3>商品分类</h3>
        <ul>
          <li :class="{ active: !categoryId }" @click="categoryId = null">全部分类</li>
          <li v-for="cat in categories" :key="cat.id" :class="{ active: categoryId === cat.id }" @click="categoryId = cat.id">
            {{ cat.name }}
          </li>
        </ul>
      </aside>
      <main class="content">
        <div class="product-grid">
          <div v-for="product in products" :key="product.id" class="product-card" @click="goDetail(product.id)">
            <img :src="product.imageUrl" :alt="product.name" />
            <div class="product-info">
              <h4>{{ product.name }}</h4>
              <p class="desc">{{ product.description }}</p>
              <p class="price">¥{{ product.price }}</p>
              <button class="btn-add" @click.stop="addToCart(product.id)">加入购物车</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { categoryApi, productApi, cartApi } from '../api'

const router = useRouter()
const categories = ref([])
const products = ref([])
const categoryId = ref(null)
const username = localStorage.getItem('username') || ''

const loadCategories = async () => {
  const res = await categoryApi.list()
  categories.value = res.data.data
}

const loadProducts = async () => {
  const res = await productApi.list(categoryId.value)
  products.value = res.data.data
}

const goDetail = (id) => router.push(`/product/${id}`)

const addToCart = async (productId) => {
  try {
    await cartApi.add(productId, 1)
    alert('已加入购物车')
  } catch (e) {
    alert('请先登录')
    router.push('/login')
  }
}

const logout = () => {
  localStorage.clear()
  router.push('/login')
}

watch(categoryId, loadProducts)
onMounted(() => { loadCategories(); loadProducts() })
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; display: flex; align-items: center; }
.logo { color: #FF6700; font-size: 24px; }
.nav { margin-left: auto; display: flex; gap: 20px; }
.nav a { color: #333; text-decoration: none; }
.nav a:hover { color: #FF6700; }
.username { color: #FF6700; }
.main { padding: 20px 0; display: flex; gap: 20px; }
.sidebar { width: 200px; background: #fff; padding: 20px; }
.sidebar h3 { margin-bottom: 15px; color: #333; }
.sidebar ul { list-style: none; }
.sidebar li { padding: 10px; cursor: pointer; border-radius: 4px; }
.sidebar li:hover, .sidebar li.active { background: #FFF3E0; color: #FF6700; }
.content { flex: 1; }
.product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.product-card { background: #fff; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.product-card:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.product-card img { width: 100%; height: 200px; object-fit: cover; }
.product-info { padding: 15px; }
.product-info h4 { font-size: 14px; margin-bottom: 8px; }
.desc { font-size: 12px; color: #999; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { color: #FF6700; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
.btn-add { width: 100%; padding: 8px; background: #FF6700; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.btn-add:hover { background: #e65c00; }
</style>
