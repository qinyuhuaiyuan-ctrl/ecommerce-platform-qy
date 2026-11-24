// sdd-workitem-5 — C-class minimal regression carrier spec (testing-only).
// Two directly affected, pre-existing business chains that the theme work touches:
// identity storage during logout and the cart -> order transaction chain.

const { test, expect } = require('../frontend/node_modules/@playwright/test')
const H = require('./sdd-workitem-5.helpers.cjs')

const REGRESSION_EVIDENCE = H.EVIDENCE_DIR
const STATE = { data: null }

test.beforeAll(async ({ request }) => {
  STATE.data = await H.provisionData(request)
})

test.afterAll(async () => {
  H.writeManifest({ carrier: 'e2e/sdd-workitem-5.regression.e2e.js', regression: 2 })
})

test('C-01 退出登录后请求头不再携带旧 userId 且主题偏好与无关存储保留', async ({ browser, request }) => {
  // Drives the real login form: without a working register/login endpoint this chain cannot be
  // verified, so it must report the upstream defect rather than pass on a fabricated session.
  H.requireProvisioned(STATE.data, 'C-01 需要通过真实登录表单建立会话')
  const context = await H.newContext(browser, { device: 'desktop', colorScheme: 'light' })
  try {
    const page = await context.newPage()
    await H.primeStorage(page, { [H.THEME_KEY]: 'dark' })
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.locator('input[placeholder="用户名"]').fill(STATE.data.accountA.username)
    await page.locator('input[placeholder="密码"]').fill(STATE.data.accountA.password)
    await page.locator('.btn-primary').click()
    await page.waitForSelector('.product-grid .product-card', { timeout: 20000 })

    const headerBefore = await page.evaluate(async () => {
      const response = await fetch('/api/cart', { headers: { 'X-User-Id': String(localStorage.getItem('userId')) } })
      return response.status
    })
    expect(headerBefore, 'cart is readable while the identity header is present').toBe(200)

    await page.locator('.nav a[href="#"]').first().click()
    await page.waitForSelector('.login-box', { timeout: 15000 })
    const stored = await page.evaluate(() => ({
      userId: localStorage.getItem('userId'),
      username: localStorage.getItem('username'),
      theme: localStorage.getItem('ecommerce.display.theme.v1')
    }))
    expect(stored.userId).toBeNull()
    expect(stored.username).toBeNull()
    expect(stored.theme, 'logout must not clear the display preference').toBe('dark')

    const withoutHeader = await request.get(`${H.API_URL}/api/cart`)
    expect(withoutHeader.status(), 'without the header the server still rejects the call').toBeGreaterThanOrEqual(400)

    await page.screenshot({ path: `${REGRESSION_EVIDENCE}/C-01-logout-identity-and-theme.png` })
    H.recordCase({ id: 'C-01', scenario: 'regression', screenshots: ['.playwright-cli/_tasks/sdd-workitem-5/C-01-logout-identity-and-theme.png'], verdict: 'PASS' })
  } finally {
    await context.close()
  }
})

test('C-02 商品加购到订单创建与支付在两种主题下保持既有业务数据与写次数', async ({ browser }) => {
  const cartOwner = H.requireIdentity(STATE.data, 'userA')
  const context = await H.newContext(browser, { device: 'desktop', colorScheme: 'light' })
  try {
    const page = await context.newPage()
    await H.primeStorage(page, {
      [H.THEME_KEY]: 'light',
      userId: String(cartOwner.userId),
      username: cartOwner.username
    })
    const writes = []
    page.on('request', request => {
      if (request.method() === 'GET') return
      if (!request.url().includes('/api/')) return
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    })
    await page.goto('/products', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-grid .product-card')
    const beforeAdd = writes.length
    page.on('dialog', dialog => dialog.accept())
    await page.locator('.product-card .btn-add').first().click()
    await expect.poll(() => writes.length, { timeout: 15000 }).toBeGreaterThan(beforeAdd)
    expect(writes.filter(item => item.startsWith('POST /api/cart')).length, 'adding one cart line sends one write').toBe(1)

    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.goto('/cart', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.cart-item')
    const cartTotal = await page.locator('.total').innerText()
    expect(cartTotal).toMatch(/总计: ¥\d+/)

    const createdWrites = writes.filter(item => item.startsWith('POST /api/orders')).length
    await page.locator('.btn-checkout').click()
    await page.waitForSelector('.confirm-page')
    await page.locator('.form input').nth(0).fill('回归收货人')
    await page.locator('.form input').nth(1).fill('13800003333')
    await page.locator('.form input').nth(2).fill('回归测试地址 1 号')
    await page.locator('.btn-submit').click()
    await page.waitForURL('**/orders', { timeout: 20000 })
    await page.waitForSelector('.order-card')
    expect(writes.filter(item => item.startsWith('POST /api/orders')).length, 'one submit creates exactly one order').toBe(createdWrites + 1)
    expect((await H.readTheme(page)).root, 'the dark theme survives the business flow').toBe('dark')

    await page.screenshot({ path: `${REGRESSION_EVIDENCE}/C-02-cart-order-flow-dark.png` })
    H.recordCase({ id: 'C-02', scenario: 'regression', screenshots: ['.playwright-cli/_tasks/sdd-workitem-5/C-02-cart-order-flow-dark.png'], verdict: 'PASS' })
  } finally {
    await context.close()
  }
})
