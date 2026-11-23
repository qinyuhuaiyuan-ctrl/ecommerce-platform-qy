import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/products' },
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/register', component: () => import('../views/Register.vue') },
  { path: '/products', component: () => import('../views/ProductList.vue') },
  { path: '/product/:id', component: () => import('../views/ProductDetail.vue') },
  { path: '/cart', component: () => import('../views/Cart.vue') },
  { path: '/order/confirm', component: () => import('../views/OrderConfirm.vue') },
  { path: '/orders', component: () => import('../views/OrderList.vue') },
  { path: '/order/:id', component: () => import('../views/OrderDetail.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/products' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
