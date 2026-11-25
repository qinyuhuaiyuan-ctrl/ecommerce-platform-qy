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
            <ProductImage :src="product.imageUrl" :alt="product.name" class="card-image" />
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
import ProductImage from '../components/ProductImage.vue'

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
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  router.push('/login')
}

watch(categoryId, loadProducts)
onMounted(() => { loadCategories(); loadProducts() })
</script>

<style scoped>
.layout { min-height: 100vh; padding-bottom: 96px; }
.header { min-height: 60px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.container { width: min(1200px, 100%); padding-inline: 16px; margin: 0 auto; display: flex; align-items: center; }
.logo { color: var(--color-accent); font-size: 24px; }
.nav { margin-left: auto; display: flex; flex-wrap: wrap; gap: 20px; }
.nav a { color: var(--color-text); text-decoration: none; }
.nav a:hover { color: var(--color-accent); }
.username { color: var(--color-accent); }
.main { padding-block: 20px; display: flex; align-items: flex-start; gap: 20px; }
.sidebar { width: 200px; background: var(--color-surface); padding: 20px; }
.sidebar h3 { margin-bottom: 15px; color: var(--color-text); }
.sidebar ul { list-style: none; }
.sidebar li { padding: 10px; cursor: pointer; border-radius: 4px; }
.sidebar li:hover, .sidebar li.active { background: var(--color-accent-soft); color: var(--color-accent); }
.content { flex: 1; min-width: 0; }
.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
.product-card { background: var(--color-surface); border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.product-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-panel); }
.product-card .card-image { width: 100%; height: 200px; object-fit: cover; }
.product-info { padding: 15px; }
.product-info h4 { font-size: 14px; margin-bottom: 8px; }
.desc { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { color: var(--color-accent); font-size: 18px; font-weight: bold; margin-bottom: 10px; }
.btn-add { width: 100%; padding: 8px; background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: 4px; cursor: pointer; }
.btn-add:hover { background: var(--color-primary-hover); }
@media (max-width: 768px) {
  .header .container { flex-wrap: wrap; gap: 8px; padding-block: 8px; }
  .nav { margin-left: 0; gap: 12px; }
  .main { flex-direction: column; }
  .sidebar, .content { width: 100%; }
  .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 360px) { .product-grid { grid-template-columns: 1fr; } }
</style>
