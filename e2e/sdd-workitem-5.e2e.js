// sdd-workitem-5 — B-class acceptance carrier spec (testing-only, test-engineer owned).
// Every numbered entry follows design §10.3/§10.4 and has a 1:1 row in
// e2e/sdd-workitem-5.cases.md plus at least one screenshot in
// .playwright-cli/_tasks/sdd-workitem-5/.
//
// Round-2 note (no assertion, case count or selector semantic is relaxed by it): the
// pre-existing user endpoints on this baseline always fail (code=500, H2 reserved-word SQL
// error, backend relative to HEAD zero diff), so a real logged-in identity cannot be obtained.
// Scenarios that need one are gated through H.requireIdentity/BLOCKED page definitions and fail
// immediately with the label UPSTREAM-DEFECT[FAIL-04] instead of a timeout or a vacuous pass.
// Scenarios that login/register pages cover without a session still execute for real.
//
// Round-3 asset fix (te-02): the system-appearance emulation used `context.emulateMedia(...)`,
// which does not exist on BrowserContext in @playwright/test 1.59.1 and threw
// `TypeError: context.emulateMedia is not a function` (observed on B-E2E-130/131). All occurrences
// now call `page.emulateMedia(...)`, the documented API. No assertion, count or selector changed.

const { test, expect } = require('../frontend/node_modules/@playwright/test')
const H = require('./sdd-workitem-5.helpers.cjs')

const STATE = { data: null, pages: null }

const PAGE_ORDER = [
  ['login', '登录'],
  ['register', '注册'],
  ['products', '商品列表'],
  ['product-detail', '商品详情'],
  ['cart', '购物车'],
  ['order-confirm', '订单确认'],
  ['orders', '订单列表'],
  ['order-detail', '订单详情']
]

const CONTEXT_GROUPS = [
  { key: 'login', label: '登录表单', def: 'login' },
  { key: 'register', label: '注册表单', def: 'register' },
  { key: 'products', label: '商品列表分类选择', def: 'products' },
  { key: 'product-detail', label: '商品详情数量', def: 'product-detail' },
  { key: 'cart', label: '购物车数量与清单', def: 'cart' },
  { key: 'order-confirm', label: '订单确认收货表单', def: 'order-confirm' },
  { key: 'orders', label: '订单列表数据', def: 'orders' },
  { key: 'order-detail', label: '订单详情数据', def: 'order-detail' },
  { key: 'assistant', label: '助手对话与草稿', def: 'products' }
]

const INFLIGHT_GROUPS = [
  { key: 'login', label: '登录请求在途', def: 'login' },
  { key: 'cart-update', label: '购物车更新在途', def: 'cart' },
  { key: 'order-create', label: '创建订单在途', def: 'order-confirm' },
  { key: 'assistant', label: '助手请求在途', def: 'products' }
]

function idOf(value) {
  return `B-E2E-${String(value).padStart(3, '0')}`
}

function resolvePage(key) {
  const definition = STATE.pages.find(item => item.key === key)
  // Pages that need a real logged-in identity are labelled when the pre-existing user
  // endpoints are broken; fail fast with the upstream cause instead of an ambiguous timeout.
  if (definition && definition.blocked) throw new Error(definition.blocked)
  return definition
}

function identityA() {
  // Throws UPSTREAM-DEFECT[FAIL-04] when a legitimate identity could not be created, so an
  // identity-dependent scenario can never be recorded as a pass without a real account.
  const identity = H.requireIdentity(STATE.data, 'userA')
  return { userId: identity.userId, username: identity.username }
}

async function withContext(browser, options, body) {
  const context = await H.newContext(browser, options)
  try {
    return await body(context)
  } finally {
    await context.close()
  }
}

// Opens a page after reproducing a returning visit (storage primed on the real origin).
async function openPage(context, definition, options = {}) {
  if (!definition) throw new Error('page definition is missing for this case')
  if (definition.blocked) throw new Error(definition.blocked)
  const page = await context.newPage()
  const entries = {}
  if (options.storedTheme) entries[H.THEME_KEY] = options.storedTheme
  if (options.identity) {
    entries.userId = String(options.identity.userId)
    entries.username = options.identity.username
  }
  if (options.extraStorage) Object.assign(entries, options.extraStorage)
  await H.primeStorage(page, entries)
  await page.goto(definition.path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(definition.ready, { timeout: 20000 })
  await page.waitForFunction(() => Boolean(document.documentElement.dataset.theme))
  return page
}

// Opens a page without touching storage first (first-visit / system-follow semantics).
async function openFreshPage(context, definition) {
  const page = await context.newPage()
  await page.goto(definition.path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(definition.ready, { timeout: 20000 })
  await page.waitForFunction(() => Boolean(document.documentElement.dataset.theme))
  return page
}

function countApiWrites(page) {
  const writes = []
  page.on('request', request => {
    const method = request.method()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return
    if (!request.url().includes('/api/')) return
    writes.push(`${method} ${new URL(request.url()).pathname}`)
  })
  return writes
}

async function assistantSnapshot(page) {
  return page.evaluate(() => ({
    open: Boolean(document.querySelector('.assistant-panel')),
    messages: Array.from(document.querySelectorAll('.assistant-messages .message')).map(node => node.textContent.trim()),
    draft: document.querySelector('.assistant-input input')?.value ?? null
  }))
}

const MEDIA_SHIM = `(() => {
  window.__themeTest = { mode: 'unknown' };
  const real = window.matchMedia ? window.matchMedia.bind(window) : null;
  const fake = () => ({
    matches: false,
    media: 'not all',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {}
  });
  window.matchMedia = function (query) {
    if (window.__themeTest.mode === 'real' && real) return real(query);
    return fake();
  };
  window.__setMediaMode = next => { window.__themeTest.mode = next };
})()`

function storageBlockScript(method) {
  return `(() => {
    const key = ${JSON.stringify(H.THEME_KEY)};
    const original = Storage.prototype[${JSON.stringify(method)}];
    Storage.prototype[${JSON.stringify(method)}] = function (name, value) {
      if (name === key) throw new Error('storage blocked by test injection');
      return original.call(this, name, value);
    };
  })()`
}

const STORAGE_PROPERTY_BLOCK = `(() => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new Error('localStorage blocked by test injection'); }
  });
  window.__restoreStorage = () => { if (descriptor) Object.defineProperty(window, 'localStorage', descriptor); };
})()`

test.beforeAll(async ({ request }) => {
  STATE.data = await H.provisionData(request)
  STATE.pages = H.pageDefinitions(STATE.data)
})

test.afterAll(async () => {
  H.writeManifest({
    carrier: 'e2e/sdd-workitem-5.e2e.js',
    collected: 148,
    dataProvisioned: STATE.data ? STATE.data.provisioned === true : false,
    upstreamDefect: STATE.data ? STATE.data.upstreamDefect : null,
    provisioningEvidence: STATE.data && !STATE.data.provisioned
      ? '.playwright-cli/_tasks/sdd-workitem-5/data-provisioning.json'
      : null
  })
})

// ---------------------------------------------------------------- S-001 / S-002
// 001..016 desktop, 017..032 mobile: 8 pages x 2 themes, assistant closed + open.
for (const [pageIndex, [key, label]] of PAGE_ORDER.entries()) {
  for (const theme of ['light', 'dark']) {
    const desktopId = idOf(1 + pageIndex * 2 + (theme === 'dark' ? 1 : 0))
    test(`${desktopId} S-001 桌面端${label}在${theme === 'dark' ? '黑夜' : '白天'}模式下完整呈现（助手闭合与展开）`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: theme }, async context => {
        const definition = resolvePage(key)
        const page = await openPage(context, definition, {
          storedTheme: theme,
          identity: definition.auth ? identityA() : null
        })
        const { audit } = await H.assertThemeContract(page, definition, theme)
        const closedShot = await H.shot(page, desktopId, `${key}-desktop-${theme}-closed`)

        await H.openAssistant(page)
        const panelState = await page.evaluate(palette => {
          const panel = document.querySelector('.assistant-panel')
          const header = document.querySelector('.assistant-header')
          const input = document.querySelector('.assistant-input input')
          return {
            panelBackground: getComputedStyle(panel).backgroundColor,
            headerGradient: getComputedStyle(header).backgroundImage,
            panelText: getComputedStyle(panel).color,
            inputColor: getComputedStyle(input).color,
            expectedSurface: palette.surface,
            expectedText: palette.text
          }
        }, H.PALETTE[theme])
        expect(panelState.panelBackground, 'assistant panel surface').toBe(panelState.expectedSurface)
        expect(panelState.panelText, 'assistant panel text').toBe(panelState.expectedText)
        expect(panelState.inputColor, 'assistant input text').toBe(panelState.expectedText)
        expect(panelState.headerGradient).toContain(theme === 'dark' ? 'rgb(188, 176, 255)' : 'rgb(73, 53, 164)')
        const openShot = await H.shot(page, desktopId, `${key}-desktop-${theme}-open`)

        H.recordCase({
          id: desktopId, scenario: 'S-001', page: key, device: 'desktop', theme,
          screenshots: [closedShot, openShot], audit: audit.measured.map(item => ({ name: item.name, ratio: item.ratio, ratioBorder: item.ratioBorder })),
          verdict: 'PASS'
        })
      })
    })

    const mobileId = idOf(17 + pageIndex * 2 + (theme === 'dark' ? 1 : 0))
    test(`${mobileId} S-002 手机窄屏${label}在${theme === 'dark' ? '黑夜' : '白天'}模式下可辨认可操作（助手闭合与展开）`, async ({ browser }) => {
      await withContext(browser, { device: 'mobile', colorScheme: theme }, async context => {
        const definition = resolvePage(key)
        const page = await openPage(context, definition, {
          storedTheme: theme,
          identity: definition.auth ? identityA() : null
        })
        await H.assertThemeContract(page, definition, theme)
        await H.assertNoHorizontalScroll(page)
        const toolbarHit = await H.assertControlHitTarget(page, '.theme-toolbar button', '主题入口')
        expect(toolbarHit.box.height, 'theme toggle keeps a 40px target').toBeGreaterThanOrEqual(39)
        const closedShot = await H.shot(page, mobileId, `${key}-mobile-${theme}-closed`)

        await H.openAssistant(page)
        await H.assertControlHitTarget(page, '.assistant-panel .btn-close', '助手关闭按钮')
        await page.locator('.assistant-panel .btn-close').click()
        await page.waitForSelector('.assistant-panel', { state: 'detached' })
        const primaryHit = await H.assertControlHitTarget(page, definition.primary, `${label}核心操作`)
        expect(primaryHit.hit, 'core control is not covered after closing the assistant').toBeTruthy()
        const openShot = await H.shot(page, mobileId, `${key}-mobile-${theme}-assistant-closed`)

        H.recordCase({
          id: mobileId, scenario: 'S-002', page: key, device: 'mobile', theme,
          screenshots: [closedShot, openShot], verdict: 'PASS'
        })
      })
    })
  }
}

// ----------------------------------------------------------------------- S-003
// 033..042: five state groups x two themes.
const STATE_GROUPS = [
  { index: 0, key: 'empty-cart', label: '空购物车提示' },
  { index: 1, key: 'empty-orders', label: '空订单提示' },
  { index: 2, key: 'order-status', label: '订单五种状态' },
  { index: 3, key: 'assistant-states', label: '助手等待/失败/禁用' },
  { index: 4, key: 'native-feedback', label: '原生校验与 alert/confirm 反馈' }
]

async function readContrast(page, selector) {
  return page.evaluate(target => {
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
    const element = document.querySelector(target)
    if (!element) return { missing: true }
    let node = element
    let backdrop = { r: 255, g: 255, b: 255 }
    while (node) {
      const color = parseColor(getComputedStyle(node).backgroundColor)
      if (color && color.a >= 0.99) { backdrop = color; break }
      node = node.parentElement
    }
    const foreground = parseColor(getComputedStyle(element).color)
    const first = luminance(foreground)
    const second = luminance(backdrop)
    return {
      text: element.textContent.trim(),
      ratio: (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
      color: getComputedStyle(element).color
    }
  }, selector)
}

for (const group of STATE_GROUPS) {
  for (const theme of ['light', 'dark']) {
    const id = idOf(33 + group.index * 2 + (theme === 'dark' ? 1 : 0))
    test(`${id} S-003 ${group.label}在${theme === 'dark' ? '黑夜' : '白天'}模式下保持可辨认`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: theme }, async context => {
        const emptyAccount = H.requireIdentity(STATE.data, 'userEmpty')
        const identity = { userId: emptyAccount.userId, username: emptyAccount.username }
        let page
        let screenshot
        if (group.key === 'empty-cart') {
          page = await openPage(context, resolvePage('cart'), { storedTheme: theme, identity })
          const hint = await readContrast(page, '.empty p')
          expect(hint.text, 'empty cart hint text').toBe('购物车是空的')
          expect(hint.ratio, 'empty hint contrast').toBeGreaterThanOrEqual(4.5)
          screenshot = await H.shot(page, id, `empty-cart-${theme}`)
        } else if (group.key === 'empty-orders') {
          page = await openPage(context, resolvePage('orders'), { storedTheme: theme, identity })
          const hint = await readContrast(page, '.empty p')
          expect(hint.text, 'empty order hint text').toBe('暂无订单')
          expect(hint.ratio, 'empty hint contrast').toBeGreaterThanOrEqual(4.5)
          screenshot = await H.shot(page, id, `empty-orders-${theme}`)
        } else if (group.key === 'order-status') {
          const orders = H.ORDER_STATUS_FIXTURES.map((fixture, position) => ({
            id: 100 + position,
            totalAmount: 199 + position,
            status: fixture.status,
            statusText: fixture.statusText,
            createTime: '2026-11-20 10:0' + position,
            itemCount: 1
          }))
          page = await openPage(context, resolvePage('orders'), { storedTheme: theme, identity })
          await page.route('**/api/orders', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 200, message: 'success', data: orders })
          }))
          await page.reload({ waitUntil: 'domcontentloaded' })
          await page.waitForSelector('.order-card')
          const statuses = await page.$$eval('.order-card', cards => cards.map(card => {
            const badge = card.querySelector('.status')
            return { text: badge.textContent.trim(), color: getComputedStyle(badge).color, cls: badge.className }
          }))
          expect(statuses.map(item => item.text)).toEqual(['待支付', '已支付', '已发货', '已完成', '已取消'])
          expect(new Set(statuses.map(item => item.color)).size, 'status colours stay distinguishable').toBeGreaterThanOrEqual(4)
          screenshot = await H.shot(page, id, `order-status-group-${theme}`)
        } else if (group.key === 'assistant-states') {
          page = await openPage(context, resolvePage('products'), { storedTheme: theme, identity: identityA() })
          await page.route('**/api/assistant/chat', async route => {
            await new Promise(resolve => setTimeout(resolve, 1500))
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data: { reply: 'ok', result: [] } }) })
          })
          await H.openAssistant(page)
          await page.locator('.assistant-input input').fill('等待状态核验')
          await page.locator('.assistant-input button').click()
          await expect(page.locator('.typing')).toBeVisible()
          await expect(page.locator('.assistant-input input')).toBeDisabled()
          await page.waitForFunction(() => !document.querySelector('.typing'), null, { timeout: 15000 })
          await page.unroute('**/api/assistant/chat')
          await page.route('**/api/assistant/chat', route => route.abort())
          await page.locator('.assistant-input input').fill('失败状态核验')
          await page.locator('.assistant-input button').click()
          await page.waitForSelector('.message.assistant .msg-content:text-is("抱歉，请求失败，请稍后重试。")')
          const failure = await readContrast(page, '.message.assistant .msg-content')
          expect(failure.ratio, 'assistant failure text contrast').toBeGreaterThanOrEqual(4.5)
          screenshot = await H.shot(page, id, `assistant-states-${theme}`)
        } else {
          page = await openPage(context, resolvePage('order-confirm'), { storedTheme: theme, identity: identityA() })
          const dialogMessages = []
          page.on('dialog', async dialog => { dialogMessages.push(dialog.message()); await dialog.accept() })
          await page.locator('.btn-submit').click()
          await expect.poll(() => dialogMessages.length, { timeout: 10000 }).toBeGreaterThan(0)
          expect(dialogMessages[0]).toBe('请填写完整收货信息')
          screenshot = await H.shot(page, id, `native-feedback-${theme}`)
          await page.goto('/login', { waitUntil: 'domcontentloaded' })
          await page.waitForSelector('.login-box')
          await page.locator('.btn-primary').click()
          const validity = await page.evaluate(() => Array.from(document.querySelectorAll('form input')).map(input => input.checkValidity()))
          expect(validity.every(valid => valid === false), 'native validation blocks empty login').toBe(true)
        }
        H.recordCase({ id, scenario: 'S-003', group: group.key, theme, screenshots: [screenshot], verdict: 'PASS' })
      })
    })
  }
}

// ----------------------------------------------------------------------- S-004
// 043..058: 8 pages x 2 starting appearances, real click, no reload/no writes.
for (const [pageIndex, [key, label]] of PAGE_ORDER.entries()) {
  for (const start of ['light', 'dark']) {
    const id = idOf(43 + pageIndex * 2 + (start === 'dark' ? 1 : 0))
    const target = start === 'light' ? 'dark' : 'light'
    test(`${id} S-004 ${label}从${start === 'dark' ? '黑夜' : '白天'}模式真实点击后立即切换到${target === 'dark' ? '黑夜' : '白天'}模式`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: start }, async context => {
        const definition = resolvePage(key)
        const page = await openPage(context, definition, { storedTheme: start, identity: definition.auth ? identityA() : null })
        const writes = countApiWrites(page)
        const urlBefore = page.url()
        await page.locator('.theme-toolbar button').click()
        await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, target)
        const state = await H.readTheme(page)
        expect(state.root).toBe(target)
        expect(state.toolbar).toContain(target === 'dark' ? '黑夜模式' : '白天模式')
        expect(state.stored, 'manual choice is persisted').toBe(target)
        expect(page.url(), 'no navigation caused by the theme switch').toBe(urlBefore)
        expect(writes, 'theme switch produces no api write').toEqual([])
        const screenshot = await H.shot(page, id, `${key}-desktop-click-${start}-to-${target}`)
        H.recordCase({ id, scenario: 'S-004', page: key, from: start, to: target, screenshots: [screenshot], verdict: 'PASS' })
      })
    })
  }
}

// ----------------------------------------------------------------------- S-005
// 059..066: login/register x desktop/mobile x 2 starting appearances, keyboard/touch.
const AUTH_ENTRIES = [
  ['login', '登录', 'login'],
  ['register', '注册', 'register']
]
for (const [entryIndex, [defKey, label]] of AUTH_ENTRIES.entries()) {
  for (const device of ['desktop', 'mobile']) {
    for (const start of ['light', 'dark']) {
      const offset = entryIndex * 4 + (device === 'mobile' ? 2 : 0) + (start === 'dark' ? 1 : 0)
      const id = idOf(59 + offset)
      const target = start === 'light' ? 'dark' : 'light'
      test(`${id} S-005 未登录${device === 'mobile' ? '手机' : '桌面'}${label}页可识别并${device === 'mobile' ? '触控' : '键盘'}切换主题`, async ({ browser }) => {
        await withContext(browser, { device, colorScheme: start }, async context => {
          const definition = resolvePage(defKey)
          const page = await openPage(context, definition, { storedTheme: start })
          const toggle = page.locator('.theme-toolbar button')
          await expect(toggle).toHaveCount(1)
          if (device === 'mobile') {
            await toggle.tap()
          } else {
            await page.locator('body').click({ position: { x: 5, y: 400 } })
            let reached = false
            for (let attempt = 0; attempt < 12 && !reached; attempt += 1) {
              await page.keyboard.press('Tab')
              reached = await page.evaluate(() => document.activeElement?.classList?.contains('theme-toolbar') === false && document.activeElement?.closest?.('.theme-toolbar') !== null)
            }
            expect(reached, 'theme toggle is reachable with Tab').toBe(true)
            const focusStyle = await page.evaluate(() => {
              const element = document.activeElement
              const style = getComputedStyle(element)
              return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, tag: element.tagName }
            })
            expect(focusStyle.tag, 'focused element is the toggle button').toBe('BUTTON')
            expect(parseFloat(focusStyle.outlineWidth), 'visible focus outline').toBeGreaterThanOrEqual(2)
            await page.keyboard.press('Enter')
            await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, target)
            await page.keyboard.press('Space')
            await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, start)
            await page.keyboard.press('Enter')
          }
          await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, target)
          const state = await H.readTheme(page)
          expect(state.root).toBe(target)
          const formUsable = await page.evaluate(() => {
            const input = document.querySelector('form input')
            return Boolean(input) && !input.disabled && getComputedStyle(input).visibility !== 'hidden'
          })
          expect(formUsable, 'form keeps working without login').toBe(true)
          const screenshot = await H.shot(page, id, `${defKey}-${device}-${start}-to-${target}`)
          H.recordCase({ id, scenario: 'S-005', page: defKey, device, from: start, to: target, screenshots: [screenshot], verdict: 'PASS' })
        })
      })
    }
  }
}

// ----------------------------------------------------------------------- S-006
// 067..082: 8 pages x system light/dark, no stored preference, early head execution.
for (const [pageIndex, [key, label]] of PAGE_ORDER.entries()) {
  for (const system of ['light', 'dark']) {
    const id = idOf(67 + pageIndex * 2 + (system === 'dark' ? 1 : 0))
    test(`${id} S-006 ${label}在系统${system === 'dark' ? '黑夜' : '白天'}外观下首访即采用系统外观（Vue 挂载前已生效）`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: system }, async context => {
        const definition = resolvePage(key)
        const page = await context.newPage()
        let release
        const gate = new Promise(resolve => { release = resolve })
        await page.route('**/src/main.js', async route => { await gate; await route.continue() })
        await page.goto(definition.path, { waitUntil: 'commit' })
        await page.waitForSelector('#app', { state: 'attached', timeout: 20000 })
        await page.waitForFunction(() => Boolean(document.documentElement.dataset.theme), null, { timeout: 20000 })
        const beforeMount = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          mountedChildren: document.getElementById('app').children.length,
          stored: (() => { try { return localStorage.getItem('ecommerce.display.theme.v1') } catch { return 'unreadable' } })()
        }))
        expect(beforeMount.theme, 'theme is applied before the application mounts').toBe(system)
        expect(beforeMount.mountedChildren, 'application is not mounted when the theme is applied').toBe(0)
        expect(beforeMount.stored, 'no preference is written for system following').toBeNull()
        release()
        await page.waitForSelector(definition.ready, { timeout: 20000 })
        await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, system)
        if (definition.auth) {
          await page.goto('/login', { waitUntil: 'domcontentloaded' })
          await page.evaluate(identity => {
            localStorage.setItem('userId', String(identity.userId))
            localStorage.setItem('username', identity.username)
          }, identityA())
          await page.goto(definition.path, { waitUntil: 'domcontentloaded' })
          await page.waitForSelector(definition.ready, { timeout: 20000 })
        }
        await H.assertThemeContract(page, definition, system === 'dark' ? 'dark' : 'light')
        const screenshot = await H.shot(page, id, `${key}-first-visit-system-${system}`)
        H.recordCase({ id, scenario: 'S-006', page: key, system, earlyTheme: beforeMount.theme, screenshots: [screenshot], verdict: 'PASS' })
      })
    })
  }
}

// ----------------------------------------------------------------------- S-007
// 083..084: system follows live changes on desktop and mobile without writing a preference.
for (const device of ['desktop', 'mobile']) {
  const id = device === 'desktop' ? idOf(83) : idOf(84)
  test(`${id} S-007 ${device === 'mobile' ? '手机' : '桌面'}端未手动选择时系统外观双向变化实时跟随且不写入偏好`, async ({ browser }) => {
    await withContext(browser, { device, colorScheme: 'light' }, async context => {
      const definition = resolvePage('products')
      const page = await openPage(context, definition, { identity: identityA() })
      await page.evaluate(() => localStorage.removeItem('ecommerce.display.theme.v1'))
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
      await page.emulateMedia({ colorScheme: 'light' })
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
      const stored = await page.evaluate(() => localStorage.getItem('ecommerce.display.theme.v1'))
      expect(stored, 'following the system never writes a preference').toBeNull()
      const screenshot = await H.shot(page, id, `system-follow-${device}`)
      H.recordCase({ id, scenario: 'S-007', device, screenshots: [screenshot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-008
// 085..086: browser clears the site records, next visit follows the system again.
for (const system of ['light', 'dark']) {
  const id = system === 'light' ? idOf(85) : idOf(86)
  test(`${id} S-008 本站记录被清除后重新访问按系统${system === 'dark' ? '黑夜' : '白天'}外观显示`, async ({ browser }) => {
    await withContext(browser, { device: 'desktop', colorScheme: system }, async context => {
      const page = await context.newPage()
      await H.primeStorage(page, { [H.THEME_KEY]: system === 'light' ? 'dark' : 'light' })
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
      await page.goto('/products', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.product-card')
      await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, system)
      const state = await H.readTheme(page)
      expect(state.root).toBe(system)
      expect(state.stored, 'cleared records stay cleared').toBeNull()
      const screenshot = await H.shot(page, id, `cleared-records-system-${system}`)
      H.recordCase({ id, scenario: 'S-008', system, screenshots: [screenshot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-009
// 087..090: manual light/dark x system light/dark, system change must not override.
const MANUAL_MATRIX = [
  ['light', 'light'],
  ['light', 'dark'],
  ['dark', 'light'],
  ['dark', 'dark']
]
for (const [index, [manual, system]] of MANUAL_MATRIX.entries()) {
  const id = idOf(87 + index)
  const oppositeSystem = system === 'light' ? 'dark' : 'light'
  test(`${id} S-009 手动选择${manual === 'dark' ? '黑夜' : '白天'}、系统${system === 'dark' ? '黑夜' : '白天'}时系统变化不覆盖手动选择`, async ({ browser }) => {
    await withContext(browser, { device: 'desktop', colorScheme: system }, async context => {
      const definition = resolvePage('products')
      const page = await openPage(context, definition, { storedTheme: manual, identity: identityA() })
      expect((await H.readTheme(page)).root).toBe(manual)
      await page.emulateMedia({ colorScheme: oppositeSystem })
      await page.waitForTimeout(500)
      const state = await H.readTheme(page)
      expect(state.root, 'manual choice wins over the system change').toBe(manual)
      expect(state.toolbar).toContain(manual === 'dark' ? '黑夜模式' : '白天模式')
      expect(state.stored).toBe(manual)
      const screenshot = await H.shot(page, id, `manual-${manual}-system-${system}-changed-${oppositeSystem}`)
      H.recordCase({ id, scenario: 'S-009', manual, system, systemAfter: oppositeSystem, screenshots: [screenshot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-010
// 091..092: the most recent manual choice wins; no "follow system again" entry exists.
for (const start of ['light', 'dark']) {
  const id = start === 'light' ? idOf(91) : idOf(92)
  const last = start === 'light' ? 'light' : 'dark'
  test(`${id} S-010 从${start === 'dark' ? '黑夜' : '白天'}模式多次切换后以最后一次手动选择为准且无恢复跟随入口`, async ({ browser }) => {
    await withContext(browser, { device: 'desktop', colorScheme: start === 'light' ? 'dark' : 'light' }, async context => {
      const definition = resolvePage('products')
      const page = await openPage(context, definition, { storedTheme: start, identity: identityA() })
      const toggle = page.locator('.theme-toolbar button')
      await toggle.click()
      await page.emulateMedia({ colorScheme: start })
      await page.waitForTimeout(300)
      await toggle.click()
      await page.emulateMedia({ colorScheme: start === 'light' ? 'dark' : 'light' })
      await page.waitForTimeout(500)
      const state = await H.readTheme(page)
      expect(state.root, 'last manual choice wins').toBe(last)
      expect(state.manual ?? state.snapshot.manual).toBe(last)
      const entryCount = await page.locator('.theme-toolbar button').count()
      expect(entryCount, 'only one theme entry exists').toBe(1)
      const extraEntry = await page.evaluate(() => /跟随系统|恢复系统|reset/i.test(document.querySelector('.theme-toolbar').textContent))
      expect(extraEntry, 'no restore-system entry is added').toBe(false)
      const screenshot = await H.shot(page, id, `last-manual-${last}`)
      H.recordCase({ id, scenario: 'S-010', start, last, screenshots: [screenshot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-011
// 093..094: SPA navigation plus refresh keep the manual choice.
for (const manual of ['light', 'dark']) {
  const id = manual === 'light' ? idOf(93) : idOf(94)
  test(`${id} S-011 手动${manual === 'dark' ? '黑夜' : '白天'}模式在网页内导航与刷新后保持不变`, async ({ browser }) => {
    await withContext(browser, { device: 'desktop', colorScheme: manual === 'light' ? 'dark' : 'light' }, async context => {
      const page = await context.newPage()
      const keptIdentity = H.requireIdentity(STATE.data, 'userA')
      await H.primeStorage(page, { [H.THEME_KEY]: manual, userId: String(keptIdentity.userId), username: keptIdentity.username })
      await page.goto('/products', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.product-card')
      const visited = []
      for (const [path, ready] of [['/cart', '.cart-page'], ['/orders', '.order-page'], ['/products', '.product-card']]) {
        await page.locator(`.nav a[href="${path}"]`).first().click()
        await page.waitForSelector(ready, { timeout: 15000 })
        expect((await H.readTheme(page)).root, `theme kept on ${path}`).toBe(manual)
        visited.push(path)
      }
      const beforeReload = await H.readTheme(page)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.product-card')
      const afterReload = await H.readTheme(page)
      expect(afterReload.root, 'refresh keeps the manual choice').toBe(manual)
      expect(afterReload.stored).toBe(manual)
      expect(beforeReload.stored).toBe(manual)
      const screenshot = await H.shot(page, id, `refresh-navigation-${manual}`)
      H.recordCase({ id, scenario: 'S-011', manual, visited, screenshots: [screenshot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-012
// 095..096: close the page, reopen in the same browser while the system is opposite.
for (const manual of ['light', 'dark']) {
  const id = manual === 'light' ? idOf(95) : idOf(96)
  test(`${id} S-012 关闭页面后在同一浏览器重访仍采用已记住的${manual === 'dark' ? '黑夜' : '白天'}选择`, async ({ browser }) => {
    await withContext(browser, { device: 'desktop', colorScheme: manual === 'light' ? 'dark' : 'light' }, async context => {
      const first = await openPage(context, resolvePage('products'), {
        storedTheme: manual,
        identity: identityA()
      })
      expect((await H.readTheme(first)).root).toBe(manual)
      await first.close()
      const second = await context.newPage()
      await second.goto('/products', { waitUntil: 'domcontentloaded' })
      await second.waitForSelector('.product-card')
      const state = await H.readTheme(second)
      expect(state.root, 'revisit keeps the remembered manual choice').toBe(manual)
      expect(state.stored).toBe(manual)
      const screenshot = await H.shot(second, id, `revisit-same-browser-${manual}`)
      H.recordCase({ id, scenario: 'S-012', manual, screenshots: [screenshot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-013
// 097..098: login, logout and account switch do not reset or read another account's choice.
for (const manual of ['light', 'dark']) {
  const id = manual === 'light' ? idOf(97) : idOf(98)
  test(`${id} S-013 手动${manual === 'dark' ? '黑夜' : '白天'}模式经历登录、退出与更换账号后保持不变`, async ({ browser }) => {
    await withContext(browser, { device: 'desktop', colorScheme: manual === 'light' ? 'dark' : 'light' }, async context => {
      // This scenario drives the real login form twice; without a working register/login
      // endpoint it cannot be verified and must be reported as an upstream defect, not a pass.
      const accountARecord = H.requireIdentity(STATE.data, 'userA')
      const accountBRecord = H.requireIdentity(STATE.data, 'userB')
      const page = await context.newPage()
      await H.primeStorage(page, { [H.THEME_KEY]: manual })
      await page.evaluate(sentinel => localStorage.setItem(sentinel.key, sentinel.value), { key: H.SENTINEL_KEY, value: 'keep-me' })
      await page.goto('/login', { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('.login-box')
      expect((await H.readTheme(page)).root).toBe(manual)

      const login = async account => {
        await page.locator('input[placeholder="用户名"]').fill(account.username)
        await page.locator('input[placeholder="密码"]').fill(account.password)
        await page.locator('.btn-primary').click()
        await page.waitForSelector('.product-grid .product-card', { timeout: 20000 })
      }

      await login(STATE.data.accountA)
      let stored = await page.evaluate(() => ({ theme: localStorage.getItem('ecommerce.display.theme.v1'), userId: localStorage.getItem('userId'), sentinel: localStorage.getItem('e2e.display.sentinel') }))
      expect(stored.theme, 'login keeps the theme key').toBe(manual)
      expect(stored.userId, 'login stores the real user id').toBe(String(accountARecord.userId))
      expect((await H.readTheme(page)).root).toBe(manual)
      const afterLogin = await H.shot(page, id, `login-keep-${manual}`)

      await page.evaluate(() => document.querySelector('.nav a[href="/products"]')) // keep selector stable
      await page.locator('.nav a[href="#"]').first().click()
      await page.waitForSelector('.login-box', { timeout: 15000 })
      stored = await page.evaluate(() => ({ theme: localStorage.getItem('ecommerce.display.theme.v1'), userId: localStorage.getItem('userId'), username: localStorage.getItem('username'), sentinel: localStorage.getItem('e2e.display.sentinel') }))
      expect(stored.userId, 'logout removes the identity key').toBeNull()
      expect(stored.username, 'logout removes the username key').toBeNull()
      expect(stored.theme, 'logout keeps the theme key').toBe(manual)
      expect(stored.sentinel, 'logout keeps unrelated storage').toBe('keep-me')
      expect((await H.readTheme(page)).root).toBe(manual)

      await login(STATE.data.accountB)
      stored = await page.evaluate(() => ({ theme: localStorage.getItem('ecommerce.display.theme.v1'), userId: localStorage.getItem('userId') }))
      expect(stored.theme, 'account switch keeps the same browser preference').toBe(manual)
      expect(stored.userId, 'account switch uses the new real user id').toBe(String(accountBRecord.userId))
      expect((await H.readTheme(page)).root).toBe(manual)
      const afterSwitch = await H.shot(page, id, `switch-account-keep-${manual}`)
      H.recordCase({ id, scenario: 'S-013', manual, screenshots: [afterLogin, afterSwitch], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-014
// 099..100: an isolated browsing environment does not inherit or overwrite the choice.
for (const manual of ['light', 'dark']) {
  const id = manual === 'light' ? idOf(99) : idOf(100)
  const systemForSecond = manual === 'light' ? 'dark' : 'light'
  test(`${id} S-014 隔离浏览环境不继承${manual === 'dark' ? '黑夜' : '白天'}选择且不回写另一环境`, async ({ browser }) => {
    const first = await H.newContext(browser, { device: 'desktop', colorScheme: manual })
    const second = await H.newContext(browser, { device: 'desktop', colorScheme: systemForSecond })
    try {
      const pageA = await openPage(first, resolvePage('products'), { storedTheme: manual, identity: identityA() })
      expect((await H.readTheme(pageA)).root, 'first environment keeps its own choice').toBe(manual)

      const pageB = await second.newPage()
      const sharedIdentity = H.requireIdentity(STATE.data, 'userA')
      await H.primeStorage(pageB, { userId: String(sharedIdentity.userId), username: sharedIdentity.username })
      await pageB.goto('/products', { waitUntil: 'domcontentloaded' })
      await pageB.waitForSelector('.product-card')
      const isolated = await H.readTheme(pageB)
      expect(isolated.root, 'isolated environment follows its own system').toBe(systemForSecond)
      expect(isolated.stored, 'no preference leaks between environments').toBeNull()

      await pageB.locator('.theme-toolbar button').click()
      await pageB.waitForFunction(expected => document.documentElement.dataset.theme === expected, manual)
      expect((await H.readTheme(pageA)).root, 'the other environment is unchanged').toBe(manual)
      const screenshot = await H.shot(pageB, id, `isolated-context-${manual}`)
      H.recordCase({ id, scenario: 'S-014', manual, isolatedTheme: isolated.root, screenshots: [screenshot], verdict: 'PASS' })
    } finally {
      await first.close()
      await second.close()
    }
  })
}

// ----------------------------------------------------------------------- S-015
// 101..118: 9 context groups x 2 triggers (manual click / system change).
async function prepareContextGroup(page, key) {
  if (key === 'login' || key === 'register') {
    await page.locator('form input').nth(0).fill('草稿用户')
    await page.locator('form input').nth(1).fill('草稿密码')
    return
  }
  if (key === 'products') {
    await page.locator('.sidebar li').nth(2).click()
    await page.waitForTimeout(300)
    return
  }
  if (key === 'product-detail') {
    await page.locator('.quantity button').nth(1).click()
    await page.locator('.quantity button').nth(1).click()
    return
  }
  if (key === 'cart') {
    await page.locator('.cart-item .quantity button').nth(1).click()
    await page.waitForTimeout(500)
    return
  }
  if (key === 'order-confirm') {
    await page.locator('.form input').nth(0).fill('张三')
    await page.locator('.form input').nth(1).fill('13800002222')
    await page.locator('.form input').nth(2).fill('上海市测试路 1 号')
    return
  }
  if (key === 'orders' || key === 'order-detail') {
    return
  }
  if (key === 'assistant') {
    await H.stubAssistantReply(page, '这是主题切换前的助手回复。')
    await H.openAssistant(page)
    await page.locator('.assistant-input input').fill('切换前的问题')
    await page.locator('.assistant-input button').click()
    await page.waitForSelector('.message.assistant .msg-content')
    await page.locator('.assistant-input input').fill('尚未发送的草稿')
  }
}

async function snapshotContextGroup(page, key) {
  if (key === 'login' || key === 'register') {
    return page.$$eval('form input', inputs => inputs.map(input => input.value))
  }
  if (key === 'products') {
    return {
      active: await page.$$eval('.sidebar li', items => items.findIndex(item => item.classList.contains('active'))),
      cards: await page.locator('.product-card').count()
    }
  }
  if (key === 'product-detail') {
    return { quantity: await page.locator('.quantity span').innerText(), title: await page.locator('.product-info h2').innerText() }
  }
  if (key === 'cart') {
    return {
      items: await page.locator('.cart-item').count(),
      quantity: await page.locator('.cart-item .quantity span').first().innerText(),
      total: await page.locator('.total').innerText()
    }
  }
  if (key === 'order-confirm') {
    return {
      inputs: await page.$$eval('.form input', inputs => inputs.map(input => input.value)),
      total: await page.locator('.total').innerText(),
      items: await page.locator('.item-list .item').count()
    }
  }
  if (key === 'orders') {
    return { cards: await page.locator('.order-card').count(), firstId: await page.locator('.order-card .order-header span').first().innerText() }
  }
  if (key === 'order-detail') {
    return { orderId: await page.locator('.info-row span').nth(1).innerText(), total: await page.locator('.total').innerText() }
  }
  return assistantSnapshot(page)
}

for (const [groupIndex, group] of CONTEXT_GROUPS.entries()) {
  for (const trigger of ['manual', 'system']) {
    const id = idOf(101 + groupIndex * 2 + (trigger === 'system' ? 1 : 0))
    test(`${id} S-015 ${group.label}在${trigger === 'manual' ? '手动切换' : '系统外观变化'}后保持业务上下文`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: 'light' }, async context => {
        const ownerIdentity = H.requireIdentity(STATE.data, 'userA')
        const definition = resolvePage(group.def)
        const page = await openPage(context, definition, {
          storedTheme: trigger === 'manual' ? 'light' : null,
          identity: ownerIdentity
        })
        const writes = countApiWrites(page)
        await prepareContextGroup(page, group.key)
        const before = await snapshotContextGroup(page, group.key)
        const urlBefore = page.url()
        if (trigger === 'manual') {
          await page.locator('.theme-toolbar button').click()
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
        } else {
          await page.emulateMedia({ colorScheme: 'dark' })
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
        }
        const after = await snapshotContextGroup(page, group.key)
        expect(after, `context lost on ${group.key}/${trigger}`).toEqual(before)
        expect(page.url(), 'theme change keeps the route').toBe(urlBefore)
        expect(writes, 'theme change triggers no business write').toEqual([])
        const screenshot = await H.shot(page, id, `${group.key}-${trigger}-context`)
        H.recordCase({ id, scenario: 'S-015', group: group.key, trigger, screenshots: [screenshot], verdict: 'PASS' })
      })
    })
  }
}

// ----------------------------------------------------------------------- S-016
// 119..126: 4 in-flight operations x 2 triggers.
for (const [groupIndex, group] of INFLIGHT_GROUPS.entries()) {
  for (const trigger of ['manual', 'system']) {
    const id = idOf(119 + groupIndex * 2 + (trigger === 'system' ? 1 : 0))
    test(`${id} S-016 ${group.label}时${trigger === 'manual' ? '手动切换' : '系统外观变化'}不重复、不取消、不改变结果`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: 'light' }, async context => {
        const ownerIdentity = H.requireIdentity(STATE.data, 'userA')
        const definition = resolvePage(group.def)
        const page = await openPage(context, definition, {
          storedTheme: trigger === 'manual' ? 'light' : null,
          identity: ownerIdentity
        })
        const requests = []
        const dialogMessages = []
        page.on('dialog', async dialog => { dialogMessages.push(dialog.message()); await dialog.accept() })
        page.on('request', request => {
          if (request.method() === 'GET') return
          if (!request.url().includes('/api/')) return
          requests.push(`${request.method()} ${new URL(request.url()).pathname}`)
        })

        let release
        const gate = new Promise(resolve => { release = resolve })
        if (group.key === 'login') {
          await page.route('**/api/user/login', async route => {
            await gate
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data: { userId: ownerIdentity.userId, username: ownerIdentity.username, token: 'fixture' } }) })
          })
          await page.locator('input[placeholder="用户名"]').fill(STATE.data.accountA.username)
          await page.locator('input[placeholder="密码"]').fill(STATE.data.accountA.password)
          await page.locator('.btn-primary').click()
        } else if (group.key === 'cart-update') {
          await page.route('**/api/cart/*', async route => {
            if (route.request().method() !== 'PUT') return route.continue()
            await gate
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data: null }) })
          })
          await page.locator('.cart-item .quantity button').nth(1).click()
        } else if (group.key === 'order-create') {
          await page.route('**/api/orders', async route => {
            if (route.request().method() !== 'POST' || route.request().url().endsWith('/orders')) {
              if (route.request().method() !== 'POST') return route.continue()
            }
            await gate
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data: 424242 }) })
          })
          await page.locator('.form input').nth(0).fill('张三')
          await page.locator('.form input').nth(1).fill('13800002222')
          await page.locator('.form input').nth(2).fill('上海市测试路 1 号')
          await page.locator('.btn-submit').click()
        } else {
          await page.route('**/api/assistant/chat', async route => {
            await gate
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, message: 'success', data: { reply: '主题切换前的确定性回复', result: [] } }) })
          })
          await H.openAssistant(page)
          await page.locator('.assistant-input input').fill('在途问题')
          await page.locator('.assistant-input button').click()
        }

        await page.waitForTimeout(300)
        expect(requests.length, 'the operation was issued exactly once').toBe(1)
        if (trigger === 'manual') {
          await page.locator('.theme-toolbar button').click()
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
        } else {
          await page.emulateMedia({ colorScheme: 'dark' })
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
        }
        release()

        if (group.key === 'login') {
          await page.waitForSelector('.product-grid .product-card', { timeout: 20000 })
          expect(dialogMessages, 'login success produces no error dialog').toEqual([])
        } else if (group.key === 'cart-update') {
          await page.waitForFunction(() => document.querySelectorAll('.cart-item').length > 0)
          expect(dialogMessages).toEqual([])
        } else if (group.key === 'order-create') {
          await expect.poll(() => dialogMessages.length, { timeout: 15000 }).toBeGreaterThan(0)
          expect(dialogMessages[0]).toContain('订单创建成功')
        } else {
          await page.waitForSelector('.message.assistant .msg-content')
          const messages = await page.$$eval('.message .msg-content', nodes => nodes.map(node => node.textContent.trim()))
          expect(messages).toContain('在途问题')
          expect(messages).toContain('主题切换前的确定性回复')
        }
        expect(requests.length, 'the in-flight operation is not repeated').toBe(1)
        const screenshot = await H.shot(page, id, `${group.key}-${trigger}-inflight`)
        H.recordCase({ id, scenario: 'S-016', group: group.key, trigger, requests, screenshots: [screenshot], verdict: 'PASS' })
      })
    })
  }
}

// ----------------------------------------------------------------------- S-017
// 127..128: storage write fails, the session keeps working across pages.
for (const start of ['light', 'dark']) {
  const id = start === 'light' ? idOf(127) : idOf(128)
  test(`${id} S-017 从${start === 'dark' ? '黑夜' : '白天'}模式在偏好无法保存时仍可跨页继续浏览`, async ({ browser }) => {
    await withContext(browser, {
      device: 'desktop',
      colorScheme: start,
      initScripts: [storageBlockScript('setItem')]
    }, async context => {
      const page = await openPage(context, resolvePage('products'), { identity: identityA() })
      await page.evaluate(() => localStorage.removeItem('ecommerce.display.theme.v1'))
      const target = start === 'light' ? 'dark' : 'light'
      await page.locator('.theme-toolbar button').click()
      await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, target)
      await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
      const failureShot = await H.shot(page, id, `write-failure-${start}-to-${target}`)

      for (const [path, ready] of [['/cart', '.cart-page'], ['/orders', '.order-page'], ['/products', '.product-card']]) {
        await page.locator(`.nav a[href="${path}"]`).first().click()
        await page.waitForSelector(ready, { timeout: 15000 })
        expect((await H.readTheme(page)).root, `in-memory choice kept on ${path}`).toBe(target)
      }
      await page.emulateMedia({ colorScheme: start })
      await page.waitForTimeout(500)
      expect((await H.readTheme(page)).root, 'manual choice still wins over the system change').toBe(target)
      H.recordCase({ id, scenario: 'S-017', start, target, screenshots: [failureShot], verdict: 'PASS' })
    })
  })
}

// ----------------------------------------------------------------------- S-018
// 129..132: system appearance unavailable, then recovered.
test(`${idOf(129)} S-018 系统外观无法识别时首访采用白天模式`, async ({ browser }) => {
  await withContext(browser, {
    device: 'desktop',
    colorScheme: 'dark',
    initScripts: [MEDIA_SHIM]
  }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.waitForFunction(() => document.documentElement.dataset.theme)
    const state = await H.readTheme(page)
    expect(state.root, 'unknown system falls back to light').toBe('light')
    expect(state.snapshot.system, 'controller reports the system as unknown').toBe('unknown')
    const screenshot = await H.shot(page, idOf(129), 'system-unknown-first-visit-light')
    H.recordCase({ id: idOf(129), scenario: 'S-018', case: 'unknown-first-visit', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(130)} S-018 从白天失去系统识别时保持白天并在恢复后跟随黑夜`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'dark', initScripts: [MEDIA_SHIM] }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.evaluate(() => window.__setMediaMode('real'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.evaluate(() => window.__setMediaMode('unknown'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForTimeout(300)
    expect((await H.readTheme(page)).root, 'last effective appearance is kept').toBe('dark')
    await page.evaluate(() => window.__setMediaMode('real'))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    const screenshot = await H.shot(page, idOf(130), 'system-lost-from-dark-recovered')
    H.recordCase({ id: idOf(130), scenario: 'S-018', case: 'lost-from-dark', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(131)} S-018 从黑夜失去系统识别时保持黑夜并在恢复后跟随白天`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'dark', initScripts: [MEDIA_SHIM] }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.evaluate(() => window.__setMediaMode('real'))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.evaluate(() => window.__setMediaMode('unknown'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForTimeout(300)
    expect((await H.readTheme(page)).root).toBe('dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await page.evaluate(() => window.__setMediaMode('real'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
    const screenshot = await H.shot(page, idOf(131), 'system-lost-from-dark-recovered-light')
    H.recordCase({ id: idOf(131), scenario: 'S-018', case: 'lost-then-light', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(132)} S-018 失去系统识别后手动选择优先且能力恢复后仍保持手动`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [MEDIA_SHIM] }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.evaluate(() => window.__setMediaMode('real'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForTimeout(400)
    const state = await H.readTheme(page)
    expect(state.root, 'manual choice survives capability recovery').toBe('dark')
    expect(state.snapshot.manual).toBe('dark')
    const screenshot = await H.shot(page, idOf(132), 'manual-during-unknown-recovered')
    H.recordCase({ id: idOf(132), scenario: 'S-018', case: 'manual-during-unknown', screenshots: [screenshot], verdict: 'PASS' })
  })
})

// ----------------------------------------------------------------------- S-019
// 133..136: reading the stored preference fails.
test(`${idOf(133)} S-019 偏好无法读取时系统为白天则按白天显示且页面可用`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [storageBlockScript('getItem')] }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.waitForFunction(() => document.documentElement.dataset.theme)
    const state = await H.readTheme(page)
    expect(state.root).toBe('light')
    expect(state.snapshot.manual).toBeNull()
    const screenshot = await H.shot(page, idOf(133), 'read-failure-system-light')
    H.recordCase({ id: idOf(133), scenario: 'S-019', case: 'read-failure-light', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(134)} S-019 偏好无法读取时系统为黑夜则按黑夜显示且页面可用`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'dark', initScripts: [storageBlockScript('getItem')] }, async context => {
    const page = await context.newPage()
    await page.goto('/register', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.register-box')
    await page.waitForFunction(() => document.documentElement.dataset.theme)
    const state = await H.readTheme(page)
    expect(state.root).toBe('dark')
    expect(state.snapshot.manual).toBeNull()
    const screenshot = await H.shot(page, idOf(134), 'read-failure-system-dark')
    H.recordCase({ id: idOf(134), scenario: 'S-019', case: 'read-failure-dark', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(135)} S-019 偏好无法读取且系统不可识别时降级为白天`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'dark', initScripts: [storageBlockScript('getItem'), MEDIA_SHIM] }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.waitForFunction(() => document.documentElement.dataset.theme)
    const state = await H.readTheme(page)
    expect(state.root).toBe('light')
    expect(state.snapshot.system).toBe('unknown')
    const screenshot = await H.shot(page, idOf(135), 'read-failure-unknown-system')
    H.recordCase({ id: idOf(135), scenario: 'S-019', case: 'read-failure-unknown', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(136)} S-019 读取失败后仍能手动切换并在页面内继续浏览`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [storageBlockScript('getItem')] }, async context => {
    const page = await context.newPage()
    await page.goto('/products', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.evaluate(identity => {
      localStorage.setItem('userId', String(identity.userId))
      localStorage.setItem('username', identity.username)
    }, identityA())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.locator('.nav a[href="/cart"]').first().click()
    await page.waitForSelector('.cart-page')
    expect((await H.readTheme(page)).root).toBe('dark')
    const screenshot = await H.shot(page, idOf(136), 'read-failure-then-manual')
    H.recordCase({ id: idOf(136), scenario: 'S-019', case: 'read-failure-manual', screenshots: [screenshot], verdict: 'PASS' })
  })
})

// ----------------------------------------------------------------------- S-020
// 137..142: the new manual choice cannot be stored.
test(`${idOf(137)} S-020 无旧值时写入失败：本次浏览立即生效且不宣称已保存（系统白天）`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [storageBlockScript('setItem')] }, async context => {
    const page = await context.newPage()
    await page.goto('/products', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.evaluate(identity => {
      localStorage.setItem('userId', String(identity.userId))
      localStorage.setItem('username', identity.username)
    }, identityA())
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    expect((await H.readTheme(page)).root, 'reload returns to the readable state (system light)').toBe('light')
    const screenshot = await H.shot(page, idOf(137), 'write-failure-no-old-system-light')
    H.recordCase({ id: idOf(137), scenario: 'S-020', case: 'no-old-light', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(138)} S-020 无旧值时写入失败：本次浏览立即生效且不宣称已保存（系统黑夜）`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'dark', initScripts: [storageBlockScript('setItem')] }, async context => {
    const page = await context.newPage()
    await page.goto('/products', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.evaluate(identity => {
      localStorage.setItem('userId', String(identity.userId))
      localStorage.setItem('username', identity.username)
    }, identityA())
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
    await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    expect((await H.readTheme(page)).root, 'reload returns to the readable state (system dark)').toBe('dark')
    const screenshot = await H.shot(page, idOf(138), 'write-failure-no-old-system-dark')
    H.recordCase({ id: idOf(138), scenario: 'S-020', case: 'no-old-dark', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(139)} S-020 旧值白天且新写黑夜失败：刷新回到可读取的旧值白天`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [storageBlockScript('setItem')] }, async context => {
    const page = await context.newPage()
    const oldIdentity = H.requireIdentity(STATE.data, 'userA')
    await H.primeStorage(page, { [H.THEME_KEY]: 'light', userId: String(oldIdentity.userId), username: oldIdentity.username })
    await page.goto('/products', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
    await page.locator('.nav a[href="/cart"]').first().click()
    await page.waitForSelector('.cart-page')
    expect((await H.readTheme(page)).root, 'the unsaved choice stays valid during continuous browsing').toBe('dark')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.cart-page')
    const state = await H.readTheme(page)
    expect(state.root, 'reload shows the readable old value').toBe('light')
    expect(state.stored).toBe('light')
    const screenshot = await H.shot(page, idOf(139), 'write-failure-old-light')
    H.recordCase({ id: idOf(139), scenario: 'S-020', case: 'old-light-unwritten', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(140)} S-020 旧值黑夜且新写白天失败：刷新回到可读取的旧值黑夜`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'dark', initScripts: [storageBlockScript('setItem')] }, async context => {
    const page = await context.newPage()
    const darkIdentity = H.requireIdentity(STATE.data, 'userA')
    await H.primeStorage(page, { [H.THEME_KEY]: 'dark', userId: String(darkIdentity.userId), username: darkIdentity.username })
    await page.goto('/orders', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.order-card')
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
    await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.order-card')
    const state = await H.readTheme(page)
    expect(state.root).toBe('dark')
    expect(state.stored).toBe('dark')
    const screenshot = await H.shot(page, idOf(140), 'write-failure-old-dark')
    H.recordCase({ id: idOf(140), scenario: 'S-020', case: 'old-dark-unwritten', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(141)} S-020 存储对象本身不可访问时页面仍可用且不宣称保存成功`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [STORAGE_PROPERTY_BLOCK] }, async context => {
    const page = await context.newPage()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.login-box')
    await page.waitForFunction(() => document.documentElement.dataset.theme)
    const initial = await H.readTheme(page)
    expect(initial.root).toBe('light')
    expect(initial.stored).toBe('unreadable')
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
    await page.locator('input[placeholder="用户名"]').fill('blocked-storage-user')
    const typed = await page.locator('input[placeholder="用户名"]').inputValue()
    expect(typed, 'the page keeps working when storage is unavailable').toBe('blocked-storage-user')
    const screenshot = await H.shot(page, idOf(141), 'storage-property-blocked')
    H.recordCase({ id: idOf(141), scenario: 'S-020', case: 'storage-property-blocked', screenshots: [screenshot], verdict: 'PASS' })
  })
})

test(`${idOf(142)} S-020 写入能力恢复后下一次手动切换可成功保存`, async ({ browser }) => {
  await withContext(browser, { device: 'desktop', colorScheme: 'light', initScripts: [storageBlockScript('setItem')] }, async context => {
    const page = await context.newPage()
    const recoveredIdentity = H.requireIdentity(STATE.data, 'userA')
    await page.goto('/products', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.evaluate(identity => {
      localStorage.setItem('userId', String(identity.userId))
      localStorage.setItem('username', identity.username)
    }, identityA())
    await page.locator('.theme-toolbar button').click()
    await expect(page.locator('.theme-toolbar span[aria-live="polite"]')).toHaveText('本次浏览有效，未能保存')
    await page.evaluate(key => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (name, value) {
        if (name === key) return original.call(this, name, value)
        return original.call(this, name, value)
      }
    }, H.THEME_KEY)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    await page.evaluate(identity => {
      localStorage.setItem('userId', String(identity.userId))
    }, { userId: recoveredIdentity.userId })
    await page.locator('.theme-toolbar button').click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    const stored = await page.evaluate(() => localStorage.getItem('ecommerce.display.theme.v1'))
    expect(stored, 'the recovered storage keeps the new manual choice').toBe('dark')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.product-card')
    expect((await H.readTheme(page)).root).toBe('dark')
    const screenshot = await H.shot(page, idOf(142), 'storage-recovered-persisted')
    H.recordCase({ id: idOf(142), scenario: 'S-020', case: 'storage-recovered', screenshots: [screenshot], verdict: 'PASS' })
  })
})

// ----------------------------------------------------------------------- S-021
// 143..148: unreadable stored values are ignored, then a valid manual choice takes over.
const INVALID_VALUES = [
  ['sepia', 'sepia'],
  ['empty-string', ''],
  ['json-object', '{"theme":"dark"}']
]
for (const [valueIndex, [valueKey, invalidValue]] of INVALID_VALUES.entries()) {
  for (const system of ['light', 'dark']) {
    const id = idOf(143 + valueIndex * 2 + (system === 'dark' ? 1 : 0))
    test(`${id} S-021 存储值 ${valueKey} 无效时忽略并按系统${system === 'dark' ? '黑夜' : '白天'}显示且随后可正常手动选择`, async ({ browser }) => {
      await withContext(browser, { device: 'desktop', colorScheme: system }, async context => {
        const page = await context.newPage()
        await H.primeStorage(page, { [H.THEME_KEY]: invalidValue })
        await page.goto('/login', { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('.login-box')
        await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, system)
        const state = await H.readTheme(page)
        expect(state.root, 'invalid stored value is ignored').toBe(system)
        expect(state.snapshot.manual, 'invalid stored value is not a manual choice').toBeNull()
        const invalidShot = await H.shot(page, id, `invalid-value-${valueKey}-${system}`)

        await page.locator('.theme-toolbar button').click()
        const target = system === 'light' ? 'dark' : 'light'
        await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, target)
        expect(await page.evaluate(() => localStorage.getItem('ecommerce.display.theme.v1'))).toBe(target)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await page.waitForSelector('.login-box')
        expect((await H.readTheme(page)).root, 'valid manual choice is persisted after ignoring an invalid value').toBe(target)
        H.recordCase({ id, scenario: 'S-021', value: valueKey, system, screenshots: [invalidShot], verdict: 'PASS' })
      })
    })
  }
}
