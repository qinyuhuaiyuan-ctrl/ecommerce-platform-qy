import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const userId = localStorage.getItem('userId')
  if (userId) {
    config.headers['X-User-Id'] = userId
  }
  return config
})

export const userApi = {
  login: (data) => api.post('/user/login', data),
  register: (data) => api.post('/user/register', data)
}

export const categoryApi = {
  list: () => api.get('/categories')
}

export const productApi = {
  list: (categoryId) => api.get('/products', { params: { categoryId } }),
  getById: (id) => api.get(`/products/${id}`)
}

export const cartApi = {
  list: () => api.get('/cart'),
  add: (productId, quantity) => api.post('/cart', { productId, quantity }),
  updateQuantity: (id, quantity) => api.put(`/cart/${id}`, { quantity }),
  delete: (id) => api.delete(`/cart/${id}`)
}

export const orderApi = {
  create: (data) => api.post('/orders', data),
  list: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  pay: (id) => api.put(`/orders/${id}/pay`),
  cancel: (id) => api.put(`/orders/${id}/cancel`)
}

export default api
