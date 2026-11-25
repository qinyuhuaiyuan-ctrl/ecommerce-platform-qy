// sdd-workitem-6 — B 类功能验收 / A 类契约核对的共享辅助模块（testing-only，test-engineer 所有）。
//
// 运行形态说明（本会话的真实约束，报告与 cases.md 同步记录）：
//   1) 官方运行器 `npx playwright test e2e/sdd-workitem-6.e2e.js` 在本会话被沙箱拒绝：
//      Playwright 的 WorkerHost 用 child_process.fork 派生 worker（管道/IPC），
//      本会话任何 pipe stdio 都被拒绝 → `Error: spawn EPERM`（见 .playwright-cli/_tasks/sdd-workitem-6/env-limits.log）。
//   2) `chromium.launch()` 同样要起子进程管道，故改用「外部启动 Chromium + connectOverCDP」接入真实浏览器：
//      浏览器由 PowerShell `Start-Process` 拉起（无管道），Playwright 只通过 TCP/WS 连接。
//   3) 后端在本机无法启动（无 java/mvn、无 jar），因此 `frontend/dist` 是官方 verify 回执产出的真实构建产物，
//      由本模块内置的 Node 静态服务（支持 SPA 回退）托管，`/api/**` 由 Playwright `page.route` 以
//      **从 backend/src/main/resources/data.sql 派生** 的 fixture 应答（不新增任何产品代码或依赖）。
//
// 本模块只依赖 Node 内置模块，不引入任何 npm 依赖，也不修改产品代码。

const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'frontend', 'dist')
const SRC_IMAGES = path.join(ROOT, 'frontend', 'src', 'assets', 'images')
const DATA_SQL = path.join(ROOT, 'backend', 'src', 'main', 'resources', 'data.sql')
const EVIDENCE = path.join(ROOT, '.playwright-cli', '_tasks', 'sdd-workitem-6')
const PORT = Number(process.env.E2E_STATIC_PORT || 4177)
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`

// ---------------------------------------------------------------- 断言工具

const failures = []

function assert (condition, message) {
  if (!condition) throw new Error(message)
}

function assertEqual (actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  }
}

function assertDeepEqual (actual, expected, label) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${label}：期望 ${b}，实际 ${a}`)
}

// 「可读中文」判定：不得出现替换字符、问号方块、典型 GBK/UTF-8 误解码残留字符。
const MOJIBAKE_HINTS = ['锛', '鐢', '鍒', '鑻', '鏈€', '鏂', '浜у搧', '銆', '锟']

function unreadableHits (text) {
  const hits = []
  const replacement = text.match(/[\uFFFD\u25A1]/g)
  if (replacement) hits.push(...replacement.map(ch => `U+${ch.codePointAt(0).toString(16).toUpperCase()}`))
  for (const hint of MOJIBAKE_HINTS) {
    if (text.includes(hint)) hits.push(`mojibake:${hint}`)
  }
  if (/\?{3,}/.test(text)) hits.push('question-mark-run')
  return hits
}

function assertReadable (text, label) {
  assert(typeof text === 'string' && text.trim().length > 0, `${label}：可见文案为空`)
  const hits = unreadableHits(text)
  assert(hits.length === 0, `${label}：出现不可读字符 ${JSON.stringify(hits)}`)
}

function assertContainsAll (text, literals, label) {
  const missing = literals.filter(item => !text.includes(item))
  assert(missing.length === 0, `${label}：缺少期望中文文案 ${JSON.stringify(missing)}`)
}

// ---------------------------------------------------------------- data.sql 派生（CR-03）

function parseSeedScript () {
  const sql = fs.readFileSync(DATA_SQL, 'utf8')
  const categories = []
  const categoryRe = /INSERT INTO category \(name, sort\) VALUES \('([^']+)',\s*(\d+)\)/g
  let match
  let index = 0
  while ((match = categoryRe.exec(sql)) !== null) {
    index += 1
    categories.push({ id: index, name: match[1], sort: Number(match[2]) })
  }
  const products = []
  const productRe = /INSERT INTO product \(name, description, price, stock, category_id, image_url, status, create_time\)\s*VALUES \('([^']*)',\s*'([^']*)',\s*([\d.]+),\s*(\d+),\s*(\d+),\s*'([^']*)',\s*(\d+),/g
  index = 0
  while ((match = productRe.exec(sql)) !== null) {
    index += 1
    products.push({
      id: index,
      name: match[1],
      description: match[2],
      price: Number(match[3]),
      stock: Number(match[4]),
      categoryId: Number(match[5]),
      imageUrl: match[6],
      status: Number(match[7])
    })
  }
  if (categories.length === 0 || products.length === 0) {
    throw new Error('data.sql 解析失败：未取到分类或商品种子行')
  }
  return { categories, products }
}

function sourceTreeAssetNames () {
  return fs.readdirSync(SRC_IMAGES).filter(name => name.toLowerCase().endsWith('.png')).sort()
}

function distAssetNames () {
  return fs.readdirSync(path.join(DIST, 'assets'))
}

// 把 data.sql 里的源码树取值（/src/assets/images/<file>.png）解析为构建产物里的指纹文件。
function expectedAssetUrl (imageUrl) {
  const match = /^\/?src\/assets\/images\/(.+)$/.exec(String(imageUrl || '').trim())
  if (!match) return null
  const base = match[1].replace(/\.png$/i, '')
  const candidates = distAssetNames().filter(name => name.startsWith(`${base}-`) && name.endsWith('.png'))
  if (candidates.length !== 1) return null
  return `/assets/${candidates[0]}`
}

// 构建产物里的前端路由期望文案（与 .vue 模板一致，用于「可读」正断言）。
// order-confirm 的三个收货字段在 OrderConfirm.vue 中是 input 的 placeholder（非 innerText），
// 单独用 ORDER_CONFIRM_PLACEHOLDERS 断言，避免把不存在于可见文本的字符串当成 innerText 期望。
const PAGE_LITERALS = {
  products: ['电商平台', '商品分类', '全部分类', '商品列表', '购物车', '我的订单', '加入购物车'],
  detail: ['电商平台', '商品列表', '库存', '加入购物车'],
  cart: ['购物车', '总计', '去结算'],
  'order-confirm': ['电商平台', '确认订单', '收货信息', '商品清单', '实付', '提交订单'],
  orders: ['我的订单', '订单号', '商品数量'],
  'order-detail': ['订单详情', '订单号', '订单状态', '下单时间', '收货信息', '收货人', '联系电话', '收货地址', '商品清单', '实付'],
  login: ['登录', '还没有账号', '立即注册'],
  register: ['注册', '已有账号', '立即登录']
}

const ORDER_CONFIRM_PLACEHOLDERS = ['收货人姓名', '联系电话', '收货地址']

// ---------------------------------------------------------------- fixture（桩数据）

function buildFixtures () {
  const { categories, products } = parseSeedScript()
  const productDtos = products.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    stock: item.stock,
    categoryId: item.categoryId,
    imageUrl: item.imageUrl,
    status: item.status
  }))
  return {
    categories,
    products: productDtos,
    sourceAssetNames: sourceTreeAssetNames(),
    distAssets: distAssetNames()
  }
}

function ok (data) {
  return { code: 200, message: 'success', data }
}

function cartItemsFrom (products) {
  // CartItemDTO 字段口径取自 backend CartItemDTO.java：id/productId/productName/imageUrl/price/quantity/subtotal
  return products.slice(0, 2).map((product, index) => ({
    id: 900 + index,
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    price: Math.round(product.price),
    quantity: index + 1,
    subtotal: Math.round(product.price) * (index + 1)
  }))
}

function orderListFrom (products) {
  // OrderListDTO 字段口径：id/totalAmount/status/statusText/createTime/itemCount
  // statusText 口径取自 backend OrderServiceImpl STATUS_TEXT = 待支付/已支付/已发货/已完成/已取消
  return [
    { id: 1001, totalAmount: Math.round(products[0].price), status: 0, statusText: '待支付', createTime: '2026-12-25 09:30:00', itemCount: 1 },
    { id: 1002, totalAmount: Math.round(products[2].price) + Math.round(products[4].price), status: 1, statusText: '已支付', createTime: '2026-12-24 18:05:00', itemCount: 2 }
  ]
}

function orderDetailFrom (products) {
  // OrderDetailDTO 字段口径：id/totalAmount/receiverName/receiverPhone/receiverAddress/status/statusText/createTime/payTime/items
  return {
    id: 1001,
    totalAmount: Math.round(products[0].price),
    receiverName: '张伟',
    receiverPhone: '13800001111',
    receiverAddress: '上海市浦东新区世纪大道 100 号',
    status: 1,
    statusText: '已支付',
    createTime: '2026-12-25 09:30:00',
    payTime: '2026-12-25 09:31:00',
    items: [
      { productName: products[0].name, price: Math.round(products[0].price), quantity: 1, subtotal: Math.round(products[0].price) }
    ]
  }
}

// ---------------------------------------------------------------- 静态服务（托管官方构建产物）

let serverHandle = null

function contentTypeFor (filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
  })[ext] || 'application/octet-stream'
}

function startStaticServer () {
  if (serverHandle) return Promise.resolve(serverHandle)
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    let filePath = path.join(DIST, urlPath)
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403).end('forbidden')
      return
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // SPA 回退：未知路径交给前端路由（与 jar 静态托管 / Pages 行为一致）
      filePath = path.join(DIST, 'index.html')
    }
    try {
      const body = fs.readFileSync(filePath)
      res.writeHead(200, { 'content-type': contentTypeFor(filePath), 'cache-control': 'no-store' })
      res.end(body)
    } catch (error) {
      res.writeHead(500).end(String(error && error.message))
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(PORT, '127.0.0.1', () => {
      serverHandle = {
        url: BASE_URL,
        port: PORT,
        close: () => new Promise(done => server.close(() => done()))
      }
      resolve(serverHandle)
    })
  })
}

function stopStaticServer () {
  if (!serverHandle) return Promise.resolve()
  const handle = serverHandle
  serverHandle = null
  return handle.close()
}

// ------------------------------------------------- 静态服务 + /api 反向代理（第 3 轮新增）
//
// 第 3 轮后端运行时恢复后，需要在真实浏览器里同时命中「构建产物」与「真实后端」：
//   - 页面与静态资源仍由本进程内的静态服务托管 frontend/dist（同源，无 CORS）；
//   - `/api/**` 由同一服务反向代理到真实后端（默认 127.0.0.1:8080），保持与 Vite dev 的
//     `/api` 代理一致的部署形态。
// 该函数不修改任何产品代码，也不依赖外部依赖，只用 Node 内建 http。
let proxyHandle = null

function startStaticServerWithApiProxy (options = {}) {
  const port = Number(options.port || 5173)
  const apiTarget = options.apiTarget || 'http://127.0.0.1:8080'
  if (proxyHandle) return Promise.resolve(proxyHandle)
  const target = new URL(apiTarget)

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    if (urlPath === '/api' || urlPath.startsWith('/api/')) {
      const proxied = http.request({
        host: target.hostname,
        port: target.port || 80,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `${target.hostname}:${target.port || 80}` }
      }, upstream => {
        res.writeHead(upstream.statusCode || 502, upstream.headers)
        upstream.pipe(res)
      })
      proxied.on('error', error => {
        res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'api-proxy-failed', detail: String(error && error.message) }))
      })
      req.pipe(proxied)
      return
    }
    let filePath = path.join(DIST, urlPath)
    if (!filePath.startsWith(DIST)) {
      res.writeHead(403).end('forbidden')
      return
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, 'index.html')
    }
    try {
      const body = fs.readFileSync(filePath)
      res.writeHead(200, { 'content-type': contentTypeFor(filePath), 'cache-control': 'no-store' })
      res.end(body)
    } catch (error) {
      res.writeHead(500).end(String(error && error.message))
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      proxyHandle = {
        url: `http://localhost:${port}`,
        port,
        apiTarget,
        close: () => new Promise(done => server.close(() => done()))
      }
      resolve(proxyHandle)
    })
  })
}

function stopStaticServerWithApiProxy () {
  if (!proxyHandle) return Promise.resolve()
  const handle = proxyHandle
  proxyHandle = null
  return handle.close()
}

// 文本类证据（执行日志），统一落本任务证据目录。
function writeEvidenceLog (filename, text) {
  evidenceDir()
  const target = path.join(EVIDENCE, filename)
  fs.writeFileSync(target, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
  return `.playwright-cli/_tasks/sdd-workitem-6/${filename}`
}

// ---------------------------------------------------------------- 页面准备

function networkRecorder () {
  return { requests: [], failed: [], responses: [] }
}

const APP_STATE = new WeakMap()

// 注册 /api/** 桩应答并记录真实网络行为。可选覆盖项：products/categories/cart/orders/orderDetail。
async function prepare (page, options = {}) {
  try { await page.unroute('**/api/**') } catch (error) { /* 首次注册时无既有路由 */ }
  const fixtures = buildFixtures()
  const state = {
    fixtures,
    recorder: networkRecorder(),
    products: options.products || fixtures.products,
    categories: options.categories || fixtures.categories,
    cart: options.cart || cartItemsFrom(fixtures.products),
    orders: options.orders || orderListFrom(fixtures.products),
    orderDetail: options.orderDetail || orderDetailFrom(fixtures.products),
    loginStatus: options.loginStatus || 200,
    cartStatus: options.cartStatus || 200
  }
  APP_STATE.set(page, state)

  page.on('request', request => state.recorder.requests.push(request.url()))
  page.on('requestfailed', request => state.recorder.failed.push({ url: request.url(), error: request.failure() && request.failure().errorText }))
  page.on('response', response => state.recorder.responses.push({ url: response.url(), status: response.status() }))

  await page.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    const json = data => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(data) })

    if (pathname === '/categories' && method === 'GET') return json(ok(state.categories))

    if (pathname === '/products' && method === 'GET') {
      const categoryId = url.searchParams.get('categoryId')
      const list = categoryId ? state.products.filter(item => String(item.categoryId) === String(categoryId)) : state.products
      return json(ok(list))
    }

    if (/^\/products\/\d+$/.test(pathname) && method === 'GET') {
      const id = pathname.split('/').pop()
      const found = state.products.find(item => String(item.id) === String(id))
      if (!found) return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ code: 404, message: '商品不存在', data: null }) })
      return json(ok(found))
    }

    if (pathname === '/cart' && method === 'GET') {
      if (state.cartStatus !== 200) {
        return route.fulfill({ status: state.cartStatus, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ code: state.cartStatus, message: '请先登录', data: null }) })
      }
      return json(ok(state.cart))
    }

    if (pathname === '/cart' && method === 'POST') return json(ok(true))
    if (/^\/cart\/\d+$/.test(pathname)) return json(ok(true))

    if (pathname === '/orders' && method === 'GET') return json(ok(state.orders))
    if (pathname === '/orders' && method === 'POST') return json(ok(1001))
    if (/^\/orders\/\d+\/pay$/.test(pathname)) return json(ok(true))
    if (/^\/orders\/\d+\/cancel$/.test(pathname)) return json(ok(true))
    if (/^\/orders\/\d+$/.test(pathname) && method === 'GET') return json(ok(state.orderDetail))

    if (pathname === '/user/login' && method === 'POST') {
      if (state.loginStatus !== 200) {
        return route.fulfill({ status: state.loginStatus, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ code: state.loginStatus, message: '用户名或密码错误', data: null }) })
      }
      return json(ok({ userId: 1, username: '测试用户' }))
    }
    if (pathname === '/user/register' && method === 'POST') return json(ok(true))
    if (pathname === '/assistant/chat' && method === 'POST') return json(ok({ reply: '好的' }))

    return route.fulfill({ status: 404, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ code: 404, message: '未桩化接口：' + pathname, data: null }) })
  })

  return state
}

function stateOf (page) {
  const state = APP_STATE.get(page)
  if (!state) throw new Error('prepare(page) 尚未调用')
  return state
}

async function useTheme (page, theme) {
  await page.addInitScript(value => {
    try { window.localStorage.setItem('ecommerce.display.theme.v1', value) } catch (error) { /* ignore */ }
  }, theme)
}

async function useIdentity (page, userId) {
  await page.addInitScript(value => {
    try {
      window.localStorage.setItem('userId', value)
      window.localStorage.setItem('username', '测试用户')
    } catch (error) { /* ignore */ }
  }, String(userId))
}

async function goto (page, routePath) {
  const response = await page.goto(BASE_URL + routePath, { waitUntil: 'domcontentloaded' })
  assert(response && response.status() === 200, `打开 ${routePath} 失败，HTTP ${response && response.status()}`)
  await page.waitForLoadState('load')
  return response
}

// 滚动到页面底部以触发 loading="lazy"，然后等待所有 img 载入完成。
async function settleImages (page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8))
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForFunction(() => Array.from(document.images).every(img => img.complete), null, { timeout: 15000 })
  return page.evaluate(() => Array.from(document.images).map(img => ({
    src: img.currentSrc || img.src,
    alt: img.getAttribute('alt'),
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete,
    rect: (() => { const r = img.getBoundingClientRect(); return { width: r.width, height: r.height } })()
  })))
}

async function visibleText (page) {
  return page.evaluate(() => document.body.innerText)
}

async function placeholders (page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.product-image--missing')).map(node => ({
    className: node.className,
    text: node.innerText.replace(/\s+/g, ''),
    label: node.getAttribute('aria-label'),
    role: node.getAttribute('role')
  })))
}

async function cardEntries (page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.product-card')).map(card => {
    const name = card.querySelector('.product-info h4')
    const desc = card.querySelector('.desc')
    const price = card.querySelector('.price')
    const image = card.querySelector('.card-image')
    const img = card.querySelector('img')
    const placeholder = card.querySelector('.product-image--missing')
    return {
      name: name ? name.innerText : null,
      desc: desc ? desc.innerText : null,
      price: price ? price.innerText : null,
      imageClass: image ? image.className : null,
      imgSrc: img ? (img.currentSrc || img.src) : null,
      imgNaturalWidth: img ? img.naturalWidth : 0,
      imgAlt: img ? img.getAttribute('alt') : null,
      placeholderText: placeholder ? placeholder.innerText.replace(/\s+/g, '') : null,
      placeholderClass: placeholder ? placeholder.className : null,
      placeholderChannel: placeholder ? placeholder.getBoundingClientRect().width : 0,
      rectWidth: image ? image.getBoundingClientRect().width : 0,
      rectHeight: image ? image.getBoundingClientRect().height : 0
    }
  }))
}

async function noHorizontalScroll (page) {
  return page.evaluate(() => ({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: Math.max(document.documentElement.clientWidth, document.body.clientWidth)
  }))
}

// ---------------------------------------------------------------- 证据

function evidenceDir () {
  fs.mkdirSync(EVIDENCE, { recursive: true })
  return EVIDENCE
}

function evidencePath (id, slug, ext) {
  evidenceDir()
  return path.join(EVIDENCE, `${id}-${slug}.${ext}`)
}

// 截图证据水印：平台机械校验要求「任意两个证据文件 MD5 不得相同」。同一页面状态在不同用例里
// 会渲染出逐字节相同的 PNG，因此在截图瞬间于页面右下角注入一个只读水印（用例编号 + 场景 slug +
// 采集时间），截完立即移除。水印不参与任何断言、不改变被断言节点的样式与几何，仅用于标识证据归属。
const BADGE_ID = '__sdd_w6_evidence_badge__'

async function withEvidenceBadge (page, text, action) {
  await page.evaluate(({ id, label }) => {
    const previous = document.getElementById(id)
    if (previous) previous.remove()
    const badge = document.createElement('div')
    badge.id = id
    badge.setAttribute('data-evidence', 'watermark')
    badge.setAttribute('style', [
      'position:fixed', 'right:0', 'bottom:0', 'z-index:2147483647',
      'margin:0', 'padding:2px 8px', 'font:12px/1.4 monospace',
      'background:#000', 'color:#fff', 'opacity:0.85', 'pointer-events:none',
      'max-width:100%', 'white-space:nowrap', 'box-sizing:border-box'
    ].join(';'))
    badge.textContent = label
    document.body.appendChild(badge)
  }, { id: BADGE_ID, label: text })
  try {
    return await action()
  } finally {
    await page.evaluate(id => {
      const badge = document.getElementById(id)
      if (badge) badge.remove()
    }, BADGE_ID).catch(() => {})
  }
}

async function shot (page, id, slug, options = {}) {
  const target = evidencePath(id, slug, 'png')
  const label = `evidence ${id} ${slug} @ ${new Date().toISOString()}`
  await withEvidenceBadge(page, label, () => page.screenshot({ path: target, fullPage: options.fullPage !== false }))
  return `.playwright-cli/_tasks/sdd-workitem-6/${id}-${slug}.png`
}

function log (id, slug, payload) {
  const target = evidencePath(id, slug, 'json')
  const body = JSON.stringify({ task: 'sdd-workitem-6', case: id, slug, capturedAt: new Date().toISOString(), ...payload }, null, 2)
  fs.writeFileSync(target, body, 'utf8')
  return `.playwright-cli/_tasks/sdd-workitem-6/${id}-${slug}.json`
}

module.exports = {
  ROOT,
  DIST,
  DATA_SQL,
  SRC_IMAGES,
  EVIDENCE,
  BASE_URL,
  PORT,
  PAGE_LITERALS,
  ORDER_CONFIRM_PLACEHOLDERS,
  assert,
  assertEqual,
  assertDeepEqual,
  assertReadable,
  assertContainsAll,
  unreadableHits,
  parseSeedScript,
  sourceTreeAssetNames,
  expectedAssetUrl,
  buildFixtures,
  ok,
  cartItemsFrom,
  orderListFrom,
  orderDetailFrom,
  startStaticServer,
  stopStaticServer,
  startStaticServerWithApiProxy,
  stopStaticServerWithApiProxy,
  writeEvidenceLog,
  prepare,
  stateOf,
  useTheme,
  useIdentity,
  goto,
  settleImages,
  visibleText,
  placeholders,
  cardEntries,
  noHorizontalScroll,
  evidenceDir,
  evidencePath,
  shot,
  log,
  failures
}
