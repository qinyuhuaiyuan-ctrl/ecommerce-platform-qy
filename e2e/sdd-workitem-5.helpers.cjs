// Testing-only helper for sdd-workitem-5 (theme switch acceptance).
// Owned by test-engineer. Contains no product logic: only account/data preparation,
// browser capability injection, geometry/contrast assertions and evidence bookkeeping.

const fs = require('fs')
const path = require('path')
const { expect } = require('../frontend/node_modules/@playwright/test')

const ROOT = path.resolve(__dirname, '..')
const EVIDENCE_DIR = path.join(ROOT, '.playwright-cli', '_tasks', 'sdd-workitem-5')
const THEME_KEY = 'ecommerce.display.theme.v1'
const SENTINEL_KEY = 'e2e.display.sentinel'
const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:8080'

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }
}

// Semantic token values from design 3.4; browsers report background/color as rgb().
const PALETTE = {
  light: {
    bg: 'rgb(245, 245, 245)',
    surface: 'rgb(255, 255, 255)',
    surfaceMuted: 'rgb(240, 242, 245)',
    text: 'rgb(37, 43, 53)',
    textMuted: 'rgb(89, 98, 115)',
    accent: 'rgb(168, 61, 0)',
    border: 'rgb(203, 210, 220)',
    disabledBg: 'rgb(227, 231, 237)'
  },
  dark: {
    bg: 'rgb(18, 22, 29)',
    surface: 'rgb(30, 37, 48)',
    surfaceMuted: 'rgb(41, 51, 66)',
    text: 'rgb(237, 242, 247)',
    textMuted: 'rgb(182, 194, 210)',
    accent: 'rgb(255, 173, 117)',
    border: 'rgb(82, 97, 119)',
    disabledBg: 'rgb(53, 65, 81)'
  }
}

const ORDER_STATUS_FIXTURES = [
  { status: 0, statusText: '待支付' },
  { status: 1, statusText: '已支付' },
  { status: 2, statusText: '已发货' },
  { status: 3, statusText: '已完成' },
  { status: 4, statusText: '已取消' }
]

// ---------------------------------------------------------------- data helpers

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
  return EVIDENCE_DIR
}

function requireJson(body, label) {
  if (!body || typeof body !== 'object') throw new Error(`${label}: response is not JSON`)
  return body
}

// The Spring backend serves every resource under /api (the Vite dev server proxies /api).
// Prepending the prefix here keeps all call sites readable and prevents the te-01 defect where
// '/user/register' resolved to http://localhost:8080/user/register and answered HTTP 404,
// which made the preflight evidence look like an upstream failure while actually proving nothing.
function apiPath(url) {
  return url.startsWith('/api/') ? url : `/api${url}`
}

async function apiPost(request, url, data, headers) {
  const response = await request.post(`${API_URL}${apiPath(url)}`, { data, headers: headers || {} })
  const body = requireJson(await response.json().catch(() => null), `POST ${apiPath(url)}`)
  return { httpStatus: response.status(), body }
}

async function apiGet(request, url, headers) {
  const response = await request.get(`${API_URL}${apiPath(url)}`, { headers: headers || {} })
  const body = requireJson(await response.json().catch(() => null), `GET ${apiPath(url)}`)
  return { httpStatus: response.status(), body }
}

// ------------------------------------------------------- upstream-defect handling
// Round 2 fact (verified by the project manager with real responses): the pre-existing user
// endpoints are broken on this baseline. `POST /api/user/register` and `POST /api/user/login`
// always answer code=500 with an H2 reserved-word SQL syntax error, and `git diff --stat --
// backend` is empty, so the defect pre-dates this task and is outside its write scope.
// A legitimate identity therefore cannot be obtained. Scenarios that need an identity or
// prepared cart/order data must neither pass vacuously nor die on an ambiguous timeout: they
// fail immediately with the label below, and the raw API responses are written to
// .playwright-cli/_tasks/sdd-workitem-5/data-provisioning.json for the report and for the PM.
const UPSTREAM_DEFECT = 'UPSTREAM-DEFECT[FAIL-04]'
const PROVISIONING_EVIDENCE = 'data-provisioning.json'

function provisioningEvidencePath() {
  return path.join(EVIDENCE_DIR, PROVISIONING_EVIDENCE)
}

function upstreamDefectError(what, detail) {
  const suffix = detail && detail.message ? `；原始响应/错误：${detail.message}` : ''
  const error = new Error(
    `${UPSTREAM_DEFECT} 上游既有缺陷导致真实身份与交易数据前置不可得：${what}${suffix}。`
    + '该缺陷位于既有用户接口（register/login 恒返回 code=500，H2 保留字 SQL 语法错误），'
    + 'backend 相对 HEAD 零 diff，不属于本任务实现范围；原始证据 '
    + `.playwright-cli/_tasks/sdd-workitem-5/${PROVISIONING_EVIDENCE}。`
  )
  error.upstreamDefect = true
  return error
}

function requireProvisioned(data, what) {
  if (!data || data.provisioned !== true) {
    throw upstreamDefectError(
      what || '该用例要求真实账号身份与已准备的购物车/订单数据',
      data && data.upstreamDefect
    )
  }
  return data
}

function requireIdentity(data, key) {
  requireProvisioned(data, `该用例要求真实账号身份 ${key}`)
  const identity = data[key]
  if (!identity || identity.userId === null || identity.userId === undefined) {
    throw upstreamDefectError(`账号身份 ${key} 未能从真实登录获得`)
  }
  return identity
}

// Preflight: prove that a legitimate identity can be created at all. When it cannot, the
// returned object is explicitly marked provisioned:false and carries the raw evidence, so the
// specs can label the blocked scenarios instead of hiding them or faking a pass.
async function provisionData(request) {
  const diagnostics = {
    task: 'sdd-workitem-5',
    kind: 'data-provisioning',
    startedAt: new Date().toISOString(),
    apiUrl: API_URL,
    preflight: [],
    provisioned: false,
    upstreamDefect: null
  }
  const persist = () => {
    diagnostics.finishedAt = new Date().toISOString()
    ensureEvidenceDir()
    fs.writeFileSync(provisioningEvidencePath(), `${JSON.stringify(diagnostics, null, 2)}\n`, 'utf8')
  }
  const record = (step, response) => {
    const entry = {
      step,
      httpStatus: response && response.httpStatus !== undefined ? response.httpStatus : null,
      code: response && response.body ? (response.body.code ?? null) : null,
      message: response && response.body ? (response.body.message ?? null) : null
    }
    diagnostics.preflight.push(entry)
    return entry
  }
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  const password = 'te123456'
  const accountA = { username: `te_a_${suffix}`, password, phone: '13800000001' }
  const accountB = { username: `te_b_${suffix}`, password, phone: '13800000002' }
  const accountEmpty = { username: `te_c_${suffix}`, password, phone: '13800000003' }
  const preflightAccount = { username: `te_pre_${suffix}`, password, phone: '13800000004' }
  const blocked = defect => {
    diagnostics.provisioned = false
    diagnostics.upstreamDefect = defect
    persist()
    return {
      provisioned: false,
      upstreamDefect: defect,
      blockedReason: `${UPSTREAM_DEFECT} ${defect.step} → code=${defect.code}：${defect.message}`,
      password,
      accountA,
      accountB,
      accountEmpty,
      userA: null,
      userB: null,
      userEmpty: null,
      authA: null,
      authB: null,
      authEmpty: null,
      productId: null,
      productName: null,
      secondProductId: null,
      orderId: null,
      cartItemId: null,
      cartItems: []
    }
  }

  let registerResponse
  try {
    registerResponse = await apiPost(request, '/user/register', preflightAccount)
  } catch (error) {
    const defect = { step: 'POST /api/user/register', httpStatus: null, code: null, message: String(error && error.message) }
    diagnostics.preflight.push(defect)
    return blocked(defect)
  }
  const registration = record('POST /api/user/register', registerResponse)
  if (registerResponse.body.code !== 200) return blocked(registration)

  let loginResponse
  try {
    loginResponse = await apiPost(request, '/user/login', { username: preflightAccount.username, password })
  } catch (error) {
    const defect = { step: 'POST /api/user/login', httpStatus: null, code: null, message: String(error && error.message) }
    diagnostics.preflight.push(defect)
    return blocked(defect)
  }
  const session = record('POST /api/user/login', loginResponse)
  if (loginResponse.body.code !== 200 || !loginResponse.body.data || !loginResponse.body.data.userId) {
    return blocked(session)
  }

  try {
    const data = await provisionDataUnchecked(request)
    diagnostics.provisioned = true
    persist()
    return { provisioned: true, upstreamDefect: null, blockedReason: null, ...data }
  } catch (error) {
    const defect = {
      step: 'data-provisioning',
      httpStatus: null,
      code: null,
      message: String(error && error.message)
    }
    diagnostics.preflight.push(defect)
    return blocked(defect)
  }
}

// Provision real accounts, cart items and an order through the running backend.
// No ids are guessed: every value used by the specs comes from a real response.
async function provisionDataUnchecked(request) {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  const password = 'te123456'
  const accountA = { username: `te_a_${suffix}`, password, phone: '13800000001' }
  const accountB = { username: `te_b_${suffix}`, password, phone: '13800000002' }
  const accountEmpty = { username: `te_c_${suffix}`, password, phone: '13800000003' }

  for (const account of [accountA, accountB, accountEmpty]) {
    const { body } = await apiPost(request, '/user/register', account)
    expect(body.code, `register ${account.username}`).toBe(200)
  }

  const login = async (account) => {
    const { body } = await apiPost(request, '/user/login', {
      username: account.username,
      password: account.password
    })
    expect(body.code, `login ${account.username}`).toBe(200)
    return body.data
  }

  const userA = await login(accountA)
  const userB = await login(accountB)
  const userEmpty = await login(accountEmpty)

  const products = await apiGet(request, '/products')
  expect(products.body.code).toBe(200)
  const productList = products.body.data
  expect(Array.isArray(productList) && productList.length > 0, 'seed products exist').toBeTruthy()
  const product = productList.find(item => item.stock > 1) || productList[0]
  const secondProduct = productList.find(item => item.id !== product.id) || product

  const authA = { 'X-User-Id': String(userA.userId) }
  const authB = { 'X-User-Id': String(userB.userId) }
  const authEmpty = { 'X-User-Id': String(userEmpty.userId) }

  // First cart line is converted into a real pending order.
  const firstAdd = await apiPost(request, '/cart', { productId: product.id, quantity: 1 }, authA)
  expect(firstAdd.body.code, 'add cart item').toBe(200)
  const firstCart = await apiGet(request, '/cart', authA)
  const firstItems = firstCart.body.data
  expect(Array.isArray(firstItems) && firstItems.length === 1, 'cart has one prepared item').toBeTruthy()

  const orderCreation = await apiPost(request, '/orders', {
    cartIds: firstItems.map(item => item.id),
    receiverName: '测试收货人',
    receiverPhone: '13800001111',
    receiverAddress: '上海市浦东新区测试路 1 号 8 栋 801 室（长地址用于换行核验）'
  }, authA)
  expect(orderCreation.body.code, 'create prepared order').toBe(200)
  const orderId = orderCreation.body.data

  // Refill the cart so /cart and /order/confirm render real content.
  const secondAdd = await apiPost(request, '/cart', { productId: product.id, quantity: 2 }, authA)
  expect(secondAdd.body.code, 'refill cart').toBe(200)
  const cart = await apiGet(request, '/cart', authA)
  const cartItems = cart.body.data
  expect(cartItems.length > 0, 'cart is not empty for display tests').toBeTruthy()

  const orderDetail = await apiGet(request, `/orders/${orderId}`)
  expect(orderDetail.body.code, 'read prepared order').toBe(200)
  expect(orderDetail.body.data.status, 'prepared order waits for payment').toBe(0)

  // Account B gets its own cart line so the switch-account flow has real data.
  const bAdd = await apiPost(request, '/cart', { productId: secondProduct.id, quantity: 1 }, authB)
  expect(bAdd.body.code, 'add cart item for account B').toBe(200)

  return {
    password,
    accountA,
    accountB,
    accountEmpty,
    userA,
    userB,
    userEmpty,
    authA,
    authB,
    authEmpty,
    productId: product.id,
    productName: product.name,
    secondProductId: secondProduct.id,
    orderId,
    cartItemId: cartItems[0].id,
    cartItems
  }
}

// A-class real API audit: no theme endpoint exists, so the audit verifies that the
// pre-existing interfaces keep their real semantics while themes change nothing.
async function runApiAudit() {
  const out = { startedAt: new Date().toISOString(), baseUrl: API_URL, cases: [] }
  const call = async (name, fn) => {
    const started = Date.now()
    try {
      const details = await fn()
      out.cases.push({ name, verdict: 'PASS', ms: Date.now() - started, ...details })
    } catch (error) {
      out.cases.push({ name, verdict: 'FAIL', ms: Date.now() - started, error: String(error && error.message) })
    }
  }
  const request = await fetch

  const postJson = async (url, data, headers) => {
    const response = await request(`${API_URL}${url}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(headers || {}) },
      body: JSON.stringify(data)
    })
    let body = null
    try { body = await response.json() } catch { body = null }
    return { httpStatus: response.status, body }
  }
  const getJson = async (url, headers) => {
    const response = await request(`${API_URL}${url}`, { headers: headers || {} })
    let body = null
    try { body = await response.json() } catch { body = null }
    return { httpStatus: response.status, body }
  }

  const suffix = `api${Date.now().toString(36)}`
  const account = { username: `te_api_${suffix}`, password: 'te123456', phone: '13900000009' }
  let userId = null

  await call('A1-001 register returns code 200 with empty data', async () => {
    const response = await postJson('/api/user/register', account)
    if (response.body?.code !== 200) throw new Error(`code=${response.body?.code}`)
    return { httpStatus: response.httpStatus, payload: response.body }
  })

  await call('A1-002 login returns a real userId for the registered account', async () => {
    const response = await postJson('/api/user/login', { username: account.username, password: account.password })
    if (response.body?.code !== 200 || !response.body?.data?.userId) throw new Error(`unexpected payload ${JSON.stringify(response.body)}`)
    userId = response.body.data.userId
    return { httpStatus: response.httpStatus, userId }
  })

  await call('A2-001 login with a wrong password is rejected by the business result', async () => {
    const response = await postJson('/api/user/login', { username: account.username, password: 'wrong-password' })
    if (response.body?.code === 200) throw new Error('wrong password accepted')
    return { httpStatus: response.httpStatus, code: response.body?.code, message: response.body?.message }
  })

  await call('A2-002 cart list without X-User-Id is rejected by the real server', async () => {
    const response = await getJson('/api/cart')
    if (response.httpStatus < 400) throw new Error(`expected 4xx, got ${response.httpStatus}`)
    return { httpStatus: response.httpStatus }
  })

  await call('A2-003 order creation without X-User-Id is rejected by the real server', async () => {
    const response = await postJson('/api/orders', { cartIds: [1], receiverName: 'x', receiverPhone: 'x', receiverAddress: 'x' })
    if (response.httpStatus < 400) throw new Error(`expected 4xx, got ${response.httpStatus}`)
    return { httpStatus: response.httpStatus }
  })

  const auth = { 'X-User-Id': String(userId) }

  await call('A1-003 categories are returned for the UI (non-empty)', async () => {
    const response = await getJson('/api/categories')
    if (response.body?.code !== 200 || !Array.isArray(response.body.data) || response.body.data.length === 0) throw new Error('empty categories')
    return { count: response.body.data.length }
  })

  await call('A1-004 products are returned with real stock and price', async () => {
    const response = await getJson('/api/products')
    const items = response.body?.data || []
    if (response.body?.code !== 200 || items.length === 0) throw new Error('empty products')
    const sample = items[0]
    return { count: items.length, sample: { id: sample.id, price: sample.price, stock: sample.stock } }
  })

  await call('A1-005 cart add + list keep the existing contract', async () => {
    const products = await getJson('/api/products')
    const productId = products.body.data[0].id
    const added = await postJson('/api/cart', { productId, quantity: 1 }, auth)
    if (added.body?.code !== 200) throw new Error(`add code=${added.body?.code}`)
    const listed = await getJson('/api/cart', auth)
    if (listed.body?.code !== 200 || !Array.isArray(listed.body.data) || listed.body.data.length !== 1) throw new Error('cart list mismatch')
    return { itemId: listed.body.data[0].id, quantity: listed.body.data[0].quantity }
  })

  await call('A1-006 order create + read + cancel keep the existing contract', async () => {
    const cart = await getJson('/api/cart', auth)
    const cartIds = cart.body.data.map(item => item.id)
    const created = await postJson('/api/orders', {
      cartIds,
      receiverName: 'API 审计收货人',
      receiverPhone: '13900000009',
      receiverAddress: 'API 审计地址'
    }, auth)
    if (created.body?.code !== 200 || !created.body.data) throw new Error(`create code=${created.body?.code}`)
    const orderId = created.body.data
    const detail = await getJson(`/api/orders/${orderId}`)
    if (detail.body?.code !== 200 || detail.body.data.id !== orderId) throw new Error('order read mismatch')
    if (detail.body.data.status !== 0) throw new Error(`expected pending status 0, got ${detail.body.data.status}`)
    const cancelled = await postJson(`/api/orders/${orderId}/cancel`, {})
    if (cancelled.body?.code !== 200) throw new Error(`cancel code=${cancelled.body?.code}`)
    const afterCancel = await getJson(`/api/orders/${orderId}`)
    if (afterCancel.body?.data?.status !== 4) throw new Error(`expected cancelled status 4, got ${afterCancel.body?.data?.status}`)
    return { orderId, statusAfterCancel: afterCancel.body.data.status }
  })

  await call('A3-001 adding a cart line for a missing product is rejected', async () => {
    const response = await postJson('/api/cart', { productId: 999999, quantity: 1 }, auth)
    if (response.body?.code === 200) throw new Error('missing product accepted')
    return { code: response.body?.code, message: response.body?.message }
  })

  await call('A3-002 reading an unknown order returns the documented business error', async () => {
    const response = await getJson('/api/orders/999999')
    if (response.body?.code === 200) throw new Error('unknown order returned success')
    return { code: response.body?.code, message: response.body?.message }
  })

  await call('A1-007 assistant chat rejects a blank message before calling the model', async () => {
    const response = await postJson('/api/assistant/chat', { message: '   ' }, auth)
    if (response.body?.code === 200) throw new Error('blank message accepted')
    return { code: response.body?.code, message: response.body?.message }
  })

  out.finishedAt = new Date().toISOString()
  out.summary = {
    total: out.cases.length,
    passed: out.cases.filter(item => item.verdict === 'PASS').length,
    failed: out.cases.filter(item => item.verdict === 'FAIL').length
  }
  ensureEvidenceDir()
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'A-class-api-audit.json'), `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  return out
}

// ------------------------------------------------------------- browser helpers

async function newContext(browser, options = {}) {
  const device = DEVICES[options.device || 'desktop']
  const context = await browser.newContext({
    baseURL: BASE_URL,
    locale: 'zh-CN',
    colorScheme: options.colorScheme || 'light',
    ...device
  })
  if (options.initScripts) {
    for (const script of options.initScripts) {
      if (typeof script === 'string') await context.addInitScript({ content: script })
      else await context.addInitScript(script.fn, script.arg)
    }
  }
  return context
}

// Priming writes storage on the real origin before the measured navigation,
// so a "returning visit" is reproduced instead of being injected at document start.
async function primeStorage(page, entries) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.evaluate(list => {
    for (const entry of list) {
      if (entry.value === null) localStorage.removeItem(entry.key)
      else localStorage.setItem(entry.key, entry.value)
    }
  }, Object.entries(entries).map(([key, value]) => ({ key, value })))
}

function pageDefinitions(data) {
  const definitions = [
    {
      key: 'login', label: '登录', path: '/login', auth: false,
      ready: '.login-box', heading: 'h2', text: '.form-group input[placeholder="用户名"]',
      accent: '.link-text a', surface: '.login-box', primary: '.btn-primary',
      input: 'input[placeholder="用户名"]'
    },
    {
      key: 'register', label: '注册', path: '/register', auth: false,
      ready: '.register-box', heading: 'h2', text: '.form-group input[placeholder="手机号"]',
      accent: '.link-text a', surface: '.register-box', primary: '.btn-primary',
      input: 'input[placeholder="用户名"]'
    },
    {
      key: 'products', label: '商品列表', path: '/products', auth: true,
      ready: '.product-grid .product-card', heading: '.logo', text: '.product-info h4',
      accent: '.price', surface: '.product-card', primary: '.product-card .btn-add',
      input: null
    },
    {
      key: 'product-detail', label: '商品详情', path: `/product/${data.productId}`, auth: true,
      ready: '.product-detail', heading: '.product-info h2', text: '.desc',
      accent: '.price', surface: '.product-detail', primary: '.btn-add',
      input: null
    },
    {
      key: 'cart', label: '购物车', path: '/cart', auth: true,
      ready: '.cart-item', heading: '.cart-page h2', text: '.item-info h4',
      accent: '.total', surface: '.cart-page', primary: '.btn-checkout',
      input: null
    },
    {
      key: 'order-confirm', label: '订单确认', path: '/order/confirm', auth: true,
      ready: '.confirm-page', heading: '.confirm-page h2', text: '.item span',
      accent: '.total', surface: '.confirm-page', primary: '.btn-submit',
      input: '.form input[placeholder="收货人姓名"]'
    },
    {
      key: 'orders', label: '订单列表', path: '/orders', auth: true,
      ready: '.order-card', heading: '.order-page h2', text: '.status',
      accent: '.order-body .total', surface: '.order-card', primary: '.order-card',
      input: null
    },
    {
      key: 'order-detail', label: '订单详情', path: `/order/${data.orderId}`, auth: true,
      ready: '.detail-page', heading: '.detail-page h2', text: '.info-row .label',
      accent: '.total', surface: '.detail-page', primary: '.btn-pay',
      input: null
    }
  ]
  // Requirements R-001 scope note: login/register are reachable without a session, while the
  // other six pages must be visited with their existing access prerequisite, i.e. a real
  // logged-in identity. While the pre-existing user endpoints fail, that prerequisite cannot
  // be established, so those page definitions carry an explicit reason and the specs fail fast
  // with the UPSTREAM-DEFECT label instead of timing out or passing vacuously.
  const blockedReason = data && data.provisioned === true
    ? null
    : (data && data.blockedReason) || `${UPSTREAM_DEFECT} 真实身份与交易数据前置不可得`
  return definitions.map(definition => ({
    ...definition,
    blocked: definition.auth ? blockedReason : null
  }))
}

async function openPage(context, url, readySelector) {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (readySelector) await page.waitForSelector(readySelector, { timeout: 15000 })
  await page.waitForFunction(() => document.documentElement.dataset.theme, null, { timeout: 10000 })
  return page
}

async function readTheme(page) {
  return page.evaluate(() => ({
    root: document.documentElement.dataset.theme,
    colorScheme: document.documentElement.style.colorScheme,
    toolbar: document.querySelector('.theme-toolbar button')?.textContent.trim() || null,
    toolbarLabel: document.querySelector('.theme-toolbar button')?.getAttribute('aria-label') || null,
    stored: (() => { try { return localStorage.getItem('ecommerce.display.theme.v1') } catch { return 'unreadable' } })(),
    snapshot: window.__ECOMMERCE_THEME__ ? window.__ECOMMERCE_THEME__.getSnapshot() : null
  }))
}

// Geometry + computed-style audit executed inside the page.
const MEASURE = ({ probes }) => {
  const parseColor = input => {
    const match = String(input || '').match(/rgba?\(([^)]+)\)/)
    if (!match) return null
    const parts = match[1].split(',').map(part => parseFloat(part.trim()))
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }
  const luminance = color => {
    const channel = value => {
      const scaled = value / 255
      return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  }
  const contrast = (a, b) => {
    if (!a || !b) return null
    const first = luminance(a)
    const second = luminance(b)
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  }
  const rgbText = color => (color ? `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})` : null)
  const background = element => {
    let node = element
    while (node) {
      const style = getComputedStyle(node)
      const color = parseColor(style.backgroundColor)
      if (color && color.a >= 0.99) return { color, source: `background-color:${node.tagName.toLowerCase()}` }
      const gradient = style.backgroundImage
      if (gradient && gradient !== 'none') {
        const stops = (gradient.match(/rgba?\([^)]*\)/g) || []).map(parseColor).filter(Boolean)
        if (stops.length) return { color: stops[0], alternate: stops[stops.length - 1], source: `gradient:${node.tagName.toLowerCase()}` }
      }
      node = node.parentElement
    }
    return { color: { r: 255, g: 255, b: 255 }, source: 'default' }
  }
  const measured = probes.map(probe => {
    const element = document.querySelector(probe.selector)
    if (!element) return { name: probe.name, selector: probe.selector, kind: probe.kind, missing: true }
    const style = getComputedStyle(element, probe.pseudo || null)
    const backdrop = background(element)
    const record = {
      name: probe.name,
      selector: probe.selector,
      kind: probe.kind,
      foreground: style.color,
      backdrop: rgbText(backdrop.color),
      backdropSource: backdrop.source
    }
    record.ratio = contrast(parseColor(style.color), backdrop.color)
    if (backdrop.alternate) record.ratioAlternate = contrast(parseColor(style.color), backdrop.alternate)
    if (probe.kind === 'border') {
      record.borderColor = style.borderTopColor
      record.borderWidth = parseFloat(style.borderTopWidth)
      record.ratioBorder = contrast(parseColor(style.borderTopColor), backdrop.color)
    }
    if (probe.kind === 'focus') {
      record.outlineColor = style.outlineColor
      record.outlineWidth = parseFloat(style.outlineWidth)
      record.ratioOutline = contrast(parseColor(style.outlineColor), backdrop.color)
    }
    if (probe.kind === 'surface') {
      record.backgroundColor = rgbText(parseColor(style.backgroundColor))
    }
    return record
  })
  const scroll = {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth
  }
  return {
    measured,
    scroll,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    rootBackground: getComputedStyle(document.documentElement).backgroundColor,
    viewport: { width: window.innerWidth, height: window.innerHeight }
  }
}

function probeList(definition) {
  const probes = [
    { name: 'heading', selector: definition.heading, kind: 'text' },
    { name: 'body-text', selector: definition.text, kind: 'text' },
    { name: 'accent-text', selector: definition.accent, kind: 'text' },
    { name: 'primary-control', selector: definition.primary, kind: 'text' },
    { name: 'toolbar-button', selector: '.theme-toolbar button', kind: 'text' },
    { name: 'assistant-bubble', selector: '.assistant-bubble', kind: 'surface' }
  ]
  if (definition.input) {
    probes.push({ name: 'input-value', selector: definition.input, kind: 'text' })
    probes.push({ name: 'input-placeholder', selector: definition.input, kind: 'placeholder', pseudo: '::placeholder' })
    probes.push({ name: 'input-border', selector: definition.input, kind: 'border' })
  } else {
    probes.push({ name: 'surface-border', selector: definition.surface, kind: 'border' })
  }
  return probes
}

// Asserts the observable theme contract of one page for one theme.
// Text/placeholder need >= 4.5:1, focus ring >= 3:1 (design 10.3 item 2).
async function assertThemeContract(page, definition, theme) {
  const palette = PALETTE[theme]
  const state = await readTheme(page)
  expect(state.root, 'root data-theme').toBe(theme)
  expect(state.colorScheme, 'root color-scheme').toBe(theme)
  expect(state.snapshot && state.snapshot.effective, 'controller snapshot').toBe(theme)
  expect(state.toolbar, 'toolbar label').toContain(theme === 'dark' ? '黑夜模式' : '白天模式')

  const audit = await page.evaluate(MEASURE, { probes: probeList(definition) })
  const problems = []
  for (const probe of audit.measured) {
    if (probe.missing) {
      problems.push(`${probe.name} (${probe.selector}) not found`)
      continue
    }
    if (probe.kind === 'text' || probe.kind === 'placeholder') {
      const min = Math.min(probe.ratio ?? 0, probe.ratioAlternate ?? Infinity)
      if (!(min >= 4.5)) problems.push(`${probe.name} contrast ${min.toFixed(2)} < 4.5`)
    }
    if (probe.kind === 'focus') {
      if (!(probe.ratioOutline >= 3)) problems.push(`${probe.name} focus contrast ${probe.ratioOutline?.toFixed(2)} < 3`)
    }
    if (probe.kind === 'surface') {
      if (!probe.backgroundColor) problems.push(`${probe.name} has no resolvable background`)
    }
    if (probe.kind === 'border') {
      if (!(probe.borderWidth > 0)) problems.push(`${probe.name} border width is 0`)
      if (probe.borderColor === probe.backdrop) problems.push(`${probe.name} border invisible against backdrop`)
    }
  }
  expect(problems, `theme contract problems on ${definition.key}/${theme}`).toEqual([])

  // Body and main surface must resolve to the palette of the active theme.
  const appBackground = await page.evaluate(() => getComputedStyle(document.getElementById('app')).backgroundColor)
  expect(appBackground, 'app background uses the theme token').toBe(palette.bg)

  const surfaceProbe = audit.measured.find(item => item.kind === 'surface')
  expect(surfaceProbe && surfaceProbe.backgroundColor, 'assistant bubble keeps a gradient surface').toBeTruthy()
  return { state, audit }
}

async function assertNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth
  }))
  expect(overflow.document, `document scrollWidth exceeds clientWidth`).toBeLessThanOrEqual(0)
  expect(overflow.body, `body scrollWidth exceeds clientWidth`).toBeLessThanOrEqual(0)
}

async function assertControlHitTarget(page, selector, label) {
  const handle = page.locator(selector).first()
  await handle.scrollIntoViewIfNeeded()
  const box = await handle.boundingBox()
  expect(box, `${label} has a bounding box`).toBeTruthy()
  const viewport = page.viewportSize()
  expect(box.x, `${label} inside viewport (left)`).toBeGreaterThanOrEqual(0)
  expect(box.y, `${label} inside viewport (top)`).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width, `${label} inside viewport (right)`).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height, `${label} inside viewport (bottom)`).toBeLessThanOrEqual(viewport.height + 1)
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y)
    if (!element) return null
    return { tag: element.tagName, className: element.className, text: (element.textContent || '').trim().slice(0, 20) }
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  expect(hit, `${label} is hit-testable`).toBeTruthy()
  return { box, hit }
}

async function openAssistant(page) {
  await page.locator('.assistant-bubble').click()
  await page.waitForSelector('.assistant-panel', { timeout: 10000 })
  await page.locator('.assistant-input input').fill('这个主题下助手也能使用吗？')
  return page.locator('.assistant-panel')
}

async function closeAssistant(page) {
  if (await page.locator('.assistant-panel').count()) {
    await page.locator('.assistant-panel .btn-close').click()
    await page.waitForSelector('.assistant-panel', { state: 'detached', timeout: 10000 })
  }
}

function stubAssistantReply(page, reply) {
  return page.route('**/api/assistant/chat', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 200, message: 'success', data: { reply, sqlQuery: null, result: [] } })
    })
  })
}

// ------------------------------------------------------------------ evidence

const CASE_RESULTS = []

function recordCase(meta) {
  CASE_RESULTS.push({ ...meta, recordedAt: new Date().toISOString() })
}

function writeManifest(extra) {
  ensureEvidenceDir()
  const payload = {
    task: 'sdd-workitem-5',
    generatedAt: new Date().toISOString(),
    cases: CASE_RESULTS,
    ...(extra || {})
  }
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'manifest.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return payload
}

function evidencePath(id, slug) {
  return path.join(EVIDENCE_DIR, `${id}-${slug}.png`)
}

async function shot(page, id, slug) {
  ensureEvidenceDir()
  const target = evidencePath(id, slug)
  await page.screenshot({ path: target })
  if (!fs.existsSync(target)) throw new Error(`screenshot was not written: ${target}`)
  return path.relative(ROOT, target).split(path.sep).join('/')
}

module.exports = {
  ROOT,
  BASE_URL,
  API_URL,
  EVIDENCE_DIR,
  THEME_KEY,
  SENTINEL_KEY,
  UPSTREAM_DEFECT,
  PALETTE,
  DEVICES,
  ORDER_STATUS_FIXTURES,
  ensureEvidenceDir,
  provisioningEvidencePath,
  upstreamDefectError,
  requireProvisioned,
  requireIdentity,
  provisionData,
  runApiAudit,
  newContext,
  primeStorage,
  pageDefinitions,
  openPage,
  readTheme,
  assertThemeContract,
  assertNoHorizontalScroll,
  assertControlHitTarget,
  openAssistant,
  closeAssistant,
  stubAssistantReply,
  recordCase,
  writeManifest,
  shot,
  evidencePath
}
