<template>
  <div class="layout">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="router.push('/products')">电商平台</h1>
      </div>
    </header>
    <div class="main container">
      <div class="confirm-page">
        <h2>确认订单</h2>
        <div class="section">
          <h3>收货信息</h3>
          <div class="form">
            <input v-model="form.receiverName" placeholder="收货人姓名" />
            <input v-model="form.receiverPhone" placeholder="联系电话" />
            <input v-model="form.receiverAddress" placeholder="收货地址" />
          </div>
        </div>
        <div class="section">
          <h3>商品清单</h3>
          <div class="item-list">
            <div v-for="item in cartItems" :key="item.id" class="item">
              <span>{{ item.productName }}</span>
              <span>x{{ item.quantity }}</span>
              <span class="price">¥{{ item.subtotal }}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p class="total">实付: ¥{{ total }}</p>
          <button class="btn-submit" @click="submitOrder">提交订单</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cartApi, orderApi } from '../api'

const router = useRouter()
const cartItems = ref([])
const form = ref({ receiverName: '', receiverPhone: '', receiverAddress: '' })

const total = computed(() => cartItems.value.reduce((sum, item) => sum + item.subtotal, 0))

const loadCart = async () => {
  const res = await cartApi.list()
  cartItems.value = res.data.data
}

const submitOrder = async () => {
  if (!form.value.receiverName || !form.value.receiverPhone || !form.value.receiverAddress) {
    alert('请填写完整收货信息')
    return
  }
  try {
    const res = await orderApi.create({
      cartIds: cartItems.value.map(i => i.id),
      ...form.value
    })
    const orderId = res.data.data
    if (confirm('订单创建成功，是否立即支付？')) {
      await orderApi.pay(orderId)
      alert('支付成功')
      router.push('/orders')
    } else {
      router.push('/orders')
    }
  } catch (e) {
    alert(e.response?.data?.message || '创建订单失败')
  }
}

onMounted(loadCart)
</script>

<style scoped>
.layout { min-height: 100vh; }
.header { height: 60px; background: #fff; border-bottom: 1px solid #e0e0e0; }
.container { width: 1200px; margin: 0 auto; }
.logo { color: #FF6700; font-size: 24px; cursor: pointer; line-height: 60px; }
.main { padding: 40px 0; }
.confirm-page { background: #fff; padding: 30px; border-radius: 8px; }
.confirm-page h2 { margin-bottom: 30px; }
.section { margin-bottom: 30px; }
.section h3 { margin-bottom: 15px; font-size: 16px; }
.form input { width: 100%; height: 40px; padding: 0 12px; margin-bottom: 10px; border: 1px solid #e0e0e0; border-radius: 4px; }
.item-list { border: 1px solid #f0f0f0; border-radius: 4px; }
.item { display: flex; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.item span { flex: 1; }
.item .price { text-align: right; color: #FF6700; }
.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
.total { font-size: 24px; color: #FF6700; font-weight: bold; }
.btn-submit { padding: 14px 60px; background: #FF6700; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
.btn-submit:hover { background: #e65c00; }
</style>
