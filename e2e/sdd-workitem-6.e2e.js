// sdd-workitem-6 — B 类功能验收承载 spec（testing-only，test-engineer 所有）。
//
// 覆盖：R-001～R-006 / S-001～S-013，以及 NFR-001（双主题 16 组合）、NFR-003（占位两类缺失各一次）、
//       NFR-004（主页呈现耗时）、design 风险 R-02（真实计算几何与无横向滚动，闭合 CR-04）。
// 每条 test() 在 e2e/sdd-workitem-6.cases.md 有 1:1 的 GWT 文本，并在
// .playwright-cli/_tasks/sdd-workitem-6/ 至少留 1 份独立证据（截图 + 断言日志）。
//
// 运行方式（两条路径都指向同一批用例体）：
//   A. 官方运行器（具备正常子进程管道权限的环境）：
//        npx playwright test e2e/sdd-workitem-6.e2e.js
//   B. 本会话实际执行路径（沙箱禁止 pipe stdio → 官方运行器 fork worker 报 spawn EPERM）：
//        node .playwright-cli/_tasks/sdd-workitem-6/run-cases.cjs
//      该执行器用 connectOverCDP 接入外部启动的真实 Chromium，逐条执行本文件的 test() 用例体。
//
// 数据来源：/api/** 全部由 helpers 的桩应答提供，fixture 从 backend/src/main/resources/data.sql
// 现场派生（CR-03：断言与种子数据交叉，不硬编码文件名或商品清单）。

const { test, expect } = require('@playwright/test')
const H = require('./sdd-workitem-6.helpers.cjs')

const VIEWPORT_DESKTOP = { width: 1440, height: 900 }
const VIEWPORT_MOBILE = { width: 390, height: 844 }

// ---------------------------------------------------------------- B-E2E-01 S-001（正向）

test('B-E2E-01 S-001 站点入口跳转的商品列表页全部可见文案以可读中文呈现', async ({ page }) => {
  const fixtures = H.buildFixtures()
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)
  await H.goto(page, '/')
  await page.waitForURL('**/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)

  const text = await H.visibleText(page)
  H.assertReadable(text, '商品列表页可见文案')
  H.assertContainsAll(text, H.PAGE_LITERALS.products, '商品列表页固定文案')
  H.assertContainsAll(text, fixtures.categories.map(item => item.name), '商品分类名（data.sql 派生）')
  H.assertContainsAll(text, fixtures.products.map(item => item.name), '商品名称（data.sql 派生）')
  H.assertContainsAll(text, fixtures.products.map(item => item.description), '商品描述（data.sql 派生）')

  const cards = await H.cardEntries(page)
  expect(cards.length).toBe(fixtures.products.length)
  expect(cards.map(card => card.name)).toEqual(fixtures.products.map(item => item.name))
  // 逐字比对：卡片渲染出的名称与描述必须与 data.sql 种子字面量完全相等（不是子串，不是近似）。
  expect(cards.map(card => card.desc)).toEqual(fixtures.products.map(item => item.description))
  expect(cards.map(card => card.price)).toEqual(fixtures.products.map(item => `¥${item.price}`))

  const categoryLabels = await page.$$eval('.sidebar li', nodes => nodes.map(node => node.innerText.trim()))
  expect(categoryLabels).toEqual(['全部分类'].concat(fixtures.categories.map(item => item.name)))

  const evidence = await H.shot(page, 'B-E2E-01', 's001-home-readable-text')
  const log = H.log('B-E2E-01', 's001-home-readable-text', {
    viewport: VIEWPORT_DESKTOP,
    rootRedirect: page.url(),
    cards: cards.length,
    categories: categoryLabels,
    unreadableHits: H.unreadableHits(text)
  })
  expect(log).toContain('B-E2E-01')
  expect(evidence).toContain('B-E2E-01')
})

// ---------------------------------------------------------------- B-E2E-02 S-002（边界）

test('B-E2E-02 S-002 长中文与中英混排文案在桌面与窄屏逐字正确并按既有规则截断', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const longName = '超长商品名称测试：限定版「无线降噪耳机 × 蓝牙 5.3 × 主动降噪」，附赠收纳盒与 Type-C 数据线（第二批）'
  const longDescription = '中英混排长描述：支持 ANC 主动降噪 / Transparency 通透模式，单次续航 30 h，充电 10 min 可听 4 h，兼容 iOS、Android 与 Windows 设备；含 3 种耳塞尺寸与两年质保。'
  const injected = {
    id: 99,
    name: longName,
    description: longDescription,
    price: 1299,
    stock: 10,
    categoryId: 1,
    imageUrl: '/src/assets/images/iphone15.png',
    status: 1
  }
  await H.prepare(page, { products: [injected].concat(fixtures.products) })

  const results = {}
  for (const [label, viewport] of [['desktop', VIEWPORT_DESKTOP], ['mobile', VIEWPORT_MOBILE]]) {
    await page.setViewportSize(viewport)
    await H.goto(page, '/products')
    await page.waitForSelector('.product-card')
    await H.settleImages(page)

    const first = await page.$eval('.product-card', card => ({
      name: card.querySelector('.product-info h4').innerText,
      desc: card.querySelector('.desc').innerText,
      descBox: (() => {
        const node = card.querySelector('.desc')
        const style = window.getComputedStyle(node)
        return {
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          whiteSpace: style.whiteSpace,
          textOverflow: style.textOverflow,
          overflow: style.overflow
        }
      })()
    }))
    H.assertEqual(first.name, longName, `${label} 长商品名逐字一致`)
    H.assertEqual(first.desc, longDescription, `${label} 中英混排描述逐字一致`)
    H.assertReadable(first.name + first.desc, `${label} 长文案可读性`)
    H.assertEqual(first.descBox.whiteSpace, 'nowrap', `${label} 描述沿用既有单行排版`)
    H.assertEqual(first.descBox.textOverflow, 'ellipsis', `${label} 描述沿用既有省略号截断`)
    H.assert(first.descBox.scrollWidth > first.descBox.clientWidth, `${label} 长描述按既有规则被截断（scrollWidth > clientWidth）`)

    const scroll = await H.noHorizontalScroll(page)
    H.assert(scroll.scrollWidth <= scroll.clientWidth, `${label} 出现横向溢出：${JSON.stringify(scroll)}`)
    results[label] = { viewport, name: first.name, descBox: first.descBox, scroll }
    await H.shot(page, 'B-E2E-02', `s002-long-text-${label}`)
  }
  H.log('B-E2E-02', 's002-long-text', results)
})

// ---------------------------------------------------------------- B-E2E-03 S-003（异常/边界）

test('B-E2E-03 S-003 商品描述为空时名称仍可读且其他商品文案与排版不受影响', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const emptyDesc = Object.assign({}, fixtures.products[1], { id: 98, name: '无描述商品（字段为空）', description: '' })
  const products = [emptyDesc].concat(fixtures.products)
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page, { products })
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)

  const cards = await H.cardEntries(page)
  expect(cards.length).toBe(products.length)
  H.assertEqual(cards[0].name, '无描述商品（字段为空）', '空描述商品名称仍可读')
  H.assertEqual(cards[0].desc, '', '空描述渲染为空串，不产生替代字符')
  H.assertReadable(cards[0].name, '空描述商品名称')
  H.assertReadable(cards[1].desc, '相邻商品描述')
  H.assertEqual(cards[1].name, fixtures.products[0].name, '相邻商品名称未受影响')
  H.assert(cards.every(card => card.rectHeight === 200), '空描述未破坏卡片图片区既有高度 200px')

  const text = await H.visibleText(page)
  H.assertReadable(text, '整页可见文案')
  H.assertContainsAll(text, fixtures.products.map(item => item.name), '其余商品名称完整呈现')

  await H.shot(page, 'B-E2E-03', 's003-empty-description')
  H.log('B-E2E-03', 's003-empty-description', { emptyDescCard: cards[0], neighborCard: { name: cards[1].name, desc: cards[1].desc }, cardCount: cards.length })
})

// ---------------------------------------------------------------- B-E2E-04 S-004（正向）

test('B-E2E-04 S-004 每个商品的图片与自身商品一一对应且真实加载而非占位', async ({ page }) => {
  const fixtures = H.buildFixtures()
  await page.setViewportSize(VIEWPORT_DESKTOP)
  const state = await H.prepare(page)
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  const images = await H.settleImages(page)
  const cards = await H.cardEntries(page)

  expect(cards.length).toBe(fixtures.products.length)
  expect(images.length).toBe(fixtures.products.length)

  const expectedByProduct = fixtures.products.map(product => {
    const expected = H.expectedAssetUrl(product.imageUrl)
    H.assert(expected, `data.sql 取值 ${product.imageUrl} 未在构建产物中找到唯一指纹文件`)
    return { name: product.name, expected, imageUrl: product.imageUrl }
  })
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index]
    const expected = expectedByProduct[index]
    H.assertEqual(card.name, expected.name, `第 ${index + 1} 张卡片商品名`)
    H.assertEqual(card.imgAlt, expected.name, `第 ${index + 1} 张卡片图片 alt 与商品名一致`)
    H.assert(card.imgSrc && card.imgSrc.includes(expected.expected), `第 ${index + 1} 张卡片图片地址与自身商品不对应：${card.imgSrc} vs ${expected.expected}`)
    H.assert(card.imgNaturalWidth > 0, `第 ${index + 1} 张卡片图片未真实加载（naturalWidth=${card.imgNaturalWidth}）`)
    H.assert(!card.placeholderText, `第 ${index + 1} 张卡片不应出现占位`)
  }
  const uniqueSrc = new Set(expectedByProduct.map(item => item.expected))
  expect(uniqueSrc.size).toBe(fixtures.products.length)

  const sourceTreeRequests = state.recorder.requests.filter(url => url.includes('/src/assets/'))
  expect(sourceTreeRequests).toEqual([])
  const failedImageRequests = state.recorder.failed.filter(item => item.url.includes('.png'))
  expect(failedImageRequests).toEqual([])

  await H.shot(page, 'B-E2E-04', 's004-image-product-mapping')
  H.log('B-E2E-04', 's004-image-product-mapping', {
    mapping: expectedByProduct,
    loadedImages: images.map(item => ({ src: item.src, naturalWidth: item.naturalWidth })),
    sourceTreeRequests,
    failedImageRequests
  })
})

// ---------------------------------------------------------------- B-E2E-05 S-005（异常/边界）

test('B-E2E-05 S-005 单个商品图片无法获取时按占位处理且其余商品不受影响', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const target = fixtures.products[fixtures.products.length - 1]
  const targetAsset = H.expectedAssetUrl(target.imageUrl)
  H.assert(targetAsset, '目标商品图片未在构建产物中找到')
  await page.setViewportSize(VIEWPORT_DESKTOP)
  const state = await H.prepare(page)
  await page.route(url => url.pathname === targetAsset, route => route.abort('failed'))
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)

  const cards = await H.cardEntries(page)
  const failedCard = cards.find(card => card.name === target.name)
  H.assert(failedCard, '未找到失败目标商品卡片')
  H.assert(failedCard.placeholderText && failedCard.placeholderText.includes('暂无图片'), `失败商品未显示占位：${JSON.stringify(failedCard.placeholderText)}`)
  const loaded = cards.filter(card => card.imgNaturalWidth > 0)
  expect(loaded.length).toBe(fixtures.products.length - 1)
  H.assertEqual(cards.filter(card => card.placeholderText).length, 1, '仅该商品显示占位，未扩散')

  const text = await H.visibleText(page)
  H.assertReadable(text, '单图失败后整页文案')
  H.assertContainsAll(text, fixtures.products.map(item => item.name), '其余商品名称仍完整呈现')

  await H.shot(page, 'B-E2E-05', 's005-single-image-abort')
  H.log('B-E2E-05', 's005-single-image-abort', {
    abortedAsset: targetAsset,
    failedCardName: failedCard.name,
    loadedCount: loaded.length,
    placeholderCount: cards.filter(card => card.placeholderText).length,
    requestFailures: state.recorder.failed
  })
})

// ---------------------------------------------------------------- B-E2E-06 S-006（正向）

test('B-E2E-06 S-006 无图片信息的商品展示统一占位与可读中文说明且不遮挡名称价格', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const noImage = Object.assign({}, fixtures.products[2], { id: 97, name: '无图片商品（imageUrl 为空）', imageUrl: '' })
  const products = [noImage].concat(fixtures.products)
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page, { products })
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)

  const cards = await H.cardEntries(page)
  const target = cards[0]
  H.assertEqual(target.name, noImage.name, '无图片商品名称仍展示')
  H.assertEqual(target.price, `¥${noImage.price}`, '无图片商品价格仍展示')
  H.assert(target.placeholderText && target.placeholderText.includes('暂无图片'), `无图片商品未展示「暂无图片」：${JSON.stringify(target.placeholderText)}`)
  H.assertEqual(target.rectHeight, 200, '占位块保持既有图片区 200px 高，未塌陷')
  const placeholders = await H.placeholders(page)
  H.assertEqual(placeholders.length, 1, '仅无图片商品出现占位')
  H.assert(placeholders[0].label && placeholders[0].label.includes(noImage.name), `占位 aria-label 未含商品名：${placeholders[0].label}`)
  H.assertEqual(placeholders[0].role, 'img', '占位具备 role="img" 可辨识语义')

  const text = await H.visibleText(page)
  H.assertReadable(text, '含占位的整页文案')
  H.assertContainsAll(text, fixtures.products.map(item => item.name), '其余商品名称完整呈现')

  await H.shot(page, 'B-E2E-06', 's006-no-image-placeholder')
  H.log('B-E2E-06', 's006-no-image-placeholder', { card: target, placeholder: placeholders[0], cardCount: cards.length })
})

// ---------------------------------------------------------------- B-E2E-07 S-007（异常/边界）

test('B-E2E-07 S-007 原本可见的图片随后无法获取时列表页与详情页复用同一套占位', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const target = fixtures.products[3]
  const targetAsset = H.expectedAssetUrl(target.imageUrl)
  H.assert(targetAsset, '目标商品图片未在构建产物中找到')
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)

  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)
  const before = (await H.cardEntries(page)).find(card => card.name === target.name)
  H.assert(before.imgNaturalWidth > 0, '前置条件不成立：目标图片首次应正常加载')

  await page.route(url => url.pathname === targetAsset, route => route.abort('failed'))
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)
  const listCards = await H.cardEntries(page)
  const listFailed = listCards.find(card => card.name === target.name)
  H.assert(listFailed.placeholderText && listFailed.placeholderText.includes('暂无图片'), '列表页未复用占位')

  await H.goto(page, `/product/${target.id}`)
  await page.waitForSelector('.product-detail')
  await H.settleImages(page)
  const detailPlaceholders = await H.placeholders(page)
  H.assertEqual(detailPlaceholders.length, 1, '详情页应显示同一套占位')
  // 统一占位语义 = 组件自有 class 与文案一致；父级传入的布局 class（card-image / product-img）
  // 只承载各视图自身的几何尺寸，不属于占位语义，故按组件自有 class 比较（CR-05）。
  const ownClasses = value => String(value || '').split(/\s+/).filter(name => name.startsWith('product-image'))
  H.assertDeepEqual(ownClasses(detailPlaceholders[0].className), ownClasses(listFailed.placeholderClass), '列表页与详情页占位的组件自有 class 完全一致')
  H.assert(ownClasses(detailPlaceholders[0].className).includes('product-image--missing'), '两页占位均命中 product-image--missing')
  H.assertEqual(detailPlaceholders[0].text, listFailed.placeholderText, '列表页与详情页占位文案完全一致')
  H.assert(detailPlaceholders[0].text.includes('暂无图片'), '详情页占位文案为可读中文「暂无图片」')
  H.assert(detailPlaceholders[0].label.includes(target.name), '详情页占位 aria-label 含商品名')
  H.assert(detailPlaceholders[0].role === 'img', '详情页占位具备 role="img"')

  // CR-05 闭合：加载失败分支（error）与数据为空分支（no-data）必须落在同一套占位标记上。
  const emptyBranch = Object.assign({}, fixtures.products[3], { id: 95, name: '空值分支对照商品', imageUrl: '' })
  await H.prepare(page, { products: [emptyBranch].concat(fixtures.products) })
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)
  const emptySample = (await H.placeholders(page)).find(item => item.label && item.label.includes(emptyBranch.name))
  H.assert(emptySample, '未找到空值分支商品的占位')
  H.assertDeepEqual(ownClasses(emptySample.className), ownClasses(listFailed.placeholderClass), '加载失败分支与数据为空分支的占位组件 class 完全一致（CR-05）')
  H.assertEqual(emptySample.text, listFailed.placeholderText, '加载失败分支与数据为空分支的占位文案完全一致（CR-05）')
  H.assertEqual(emptySample.role, listFailed.placeholderRole || 'img', '两支占位的 role 语义一致')

  const detailText = await H.visibleText(page)
  H.assertReadable(detailText, '图片失效后的详情页文案')
  await H.shot(page, 'B-E2E-07', 's007-image-lost-placeholder')
  H.log('B-E2E-07', 's007-image-lost-placeholder', {
    target: { id: target.id, name: target.name, asset: targetAsset },
    firstLoadNaturalWidth: before.imgNaturalWidth,
    listPlaceholder: { text: listFailed.placeholderText, className: listFailed.placeholderClass, ownClasses: ownClasses(listFailed.placeholderClass) },
    detailPlaceholder: Object.assign({}, detailPlaceholders[0], { ownClasses: ownClasses(detailPlaceholders[0].className) }),
    emptyValueBranch: Object.assign({}, emptySample, { ownClasses: ownClasses(emptySample.className) })
  })
})

// ---------------------------------------------------------------- B-E2E-08 S-008（正向）

test('B-E2E-08 S-008 从列表进入详情页展示同一商品的同一张图片与同一套中文信息', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const target = fixtures.products[0]
  const expectedAsset = H.expectedAssetUrl(target.imageUrl)
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)

  const listCard = await page.$eval('.product-card', card => ({
    name: card.querySelector('.product-info h4').innerText,
    desc: card.querySelector('.desc').innerText,
    price: card.querySelector('.price').innerText,
    imgSrc: card.querySelector('img').currentSrc || card.querySelector('img').src
  }))
  await page.click('.product-card')
  await page.waitForSelector('.product-detail')
  await H.settleImages(page)

  const detail = await page.$eval('.product-detail', node => ({
    name: node.querySelector('h2').innerText,
    desc: node.querySelector('.desc').innerText,
    price: node.querySelector('.price').innerText,
    stock: node.querySelector('.stock').innerText,
    imgSrc: node.querySelector('img').currentSrc || node.querySelector('img').src,
    naturalWidth: node.querySelector('img').naturalWidth
  }))

  H.assertEqual(listCard.name, target.name, '列表页商品名与 data.sql 一致')
  H.assertEqual(detail.name, listCard.name, '详情页商品名与列表页一致')
  H.assertEqual(detail.desc, listCard.desc, '详情页描述与列表页一致')
  H.assertEqual(detail.price, listCard.price, '详情页价格与列表页一致')
  H.assertEqual(detail.imgSrc, listCard.imgSrc, '详情页图片与列表页为同一张')
  H.assert(detail.imgSrc.includes(expectedAsset), '详情页图片地址指向该商品的构建产物图片')
  H.assert(detail.naturalWidth > 0, '详情页图片真实加载')
  H.assertEqual(detail.stock, `库存: ${target.stock}`, '详情页库存口径与数据一致')
  H.assertReadable(detail.name + detail.desc + detail.price + detail.stock, '详情页文案')

  await H.shot(page, 'B-E2E-08', 's008-list-to-detail-consistent')
  H.log('B-E2E-08', 's008-list-to-detail-consistent', { listCard, detail, expectedAsset })
})

// ---------------------------------------------------------------- B-E2E-09 S-009（异常/边界）

test('B-E2E-09 S-009 直达商品详情页文案可读且图片不可获取时复用同一占位', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const target = fixtures.products[2]
  const targetAsset = H.expectedAssetUrl(target.imageUrl)
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)

  await H.goto(page, `/product/${target.id}`)
  await page.waitForSelector('.product-detail')
  await H.settleImages(page)
  const ok = await page.$eval('.product-detail', node => ({
    name: node.querySelector('h2').innerText,
    desc: node.querySelector('.desc').innerText,
    price: node.querySelector('.price').innerText,
    imgSrc: node.querySelector('img').currentSrc || node.querySelector('img').src,
    naturalWidth: node.querySelector('img').naturalWidth
  }))
  H.assertEqual(ok.name, target.name, '直达详情页商品名与数据一致')
  H.assertEqual(ok.imgSrc.includes(targetAsset), true, '直达详情页图片地址指向该商品构建产物')
  H.assert(ok.naturalWidth > 0, '图片可获取时正常展示')
  H.assertReadable(ok.name + ok.desc + ok.price, '直达详情页文案')

  await page.route(url => url.pathname === targetAsset, route => route.abort('failed'))
  await H.goto(page, `/product/${target.id}`)
  await page.waitForSelector('.product-detail')
  await H.settleImages(page)
  const placeholders = await H.placeholders(page)
  H.assertEqual(placeholders.length, 1, '图片不可获取时详情页显示统一占位')
  H.assert(placeholders[0].text.includes('暂无图片'), '占位含可读中文「暂无图片」')
  H.assert(placeholders[0].label.includes(target.name), '占位 aria-label 含商品名')
  const placeholderBox = await page.$eval('.product-image--missing', node => {
    const rect = node.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })
  H.assert(placeholderBox.height > 300 && placeholderBox.width > 300, `详情页占位未塌陷为空白：${JSON.stringify(placeholderBox)}`)
  const text = await H.visibleText(page)
  H.assertReadable(text, '图片不可获取时详情页文案')

  await H.shot(page, 'B-E2E-09', 's009-direct-detail-placeholder')
  H.log('B-E2E-09', 's009-direct-detail-placeholder', { loaded: ok, placeholder: placeholders[0], placeholderBox })
})

// ---------------------------------------------------------------- B-E2E-10 S-010（正向）

test('B-E2E-10 S-010 登录页与注册页文案可读且页面图形元素正常呈现', async ({ page }) => {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  const state = await H.prepare(page)
  const result = {}
  for (const [routePath, literals] of [['/login', H.PAGE_LITERALS.login], ['/register', H.PAGE_LITERALS.register]]) {
    await H.goto(page, routePath)
    await page.waitForSelector('form')
    const info = await page.evaluate(() => ({
      text: document.body.innerText,
      placeholders: Array.from(document.querySelectorAll('input')).map(input => input.getAttribute('placeholder')),
      imgCount: document.images.length,
      svgCount: document.querySelectorAll('svg').length,
      backgroundImage: window.getComputedStyle(document.querySelector('.login-box, .register-box')).backgroundImage,
      placeholderCount: document.querySelectorAll('.product-image--missing').length,
      themeButtonLabel: document.querySelector('.theme-toolbar button').getAttribute('aria-label')
    }))
    H.assertReadable(info.text, `${routePath} 可见文案`)
    H.assertContainsAll(info.text, literals, `${routePath} 固定文案`)
    H.assertContainsAll(info.placeholders.join('|'), routePath === '/login' ? ['用户名', '密码'] : ['用户名', '密码', '手机号'], `${routePath} 输入框占位文案`)
    info.placeholders.forEach(item => H.assertReadable(item, `${routePath} 输入框占位文案`))
    H.assertEqual(info.imgCount, 0, `${routePath} 不应引入新的图片元素（本次零改动）`)
    H.assertEqual(info.placeholderCount, 0, `${routePath} 不应出现图片占位`)
    H.assertReadable(info.themeButtonLabel, `${routePath} 主题工具栏文案`)
    result[routePath] = info
    await H.shot(page, 'B-E2E-10', `s010${routePath.replace('/', '-')}-readable`)
  }
  expect(state.recorder.failed.filter(item => item.url.includes('.png'))).toEqual([])
  H.log('B-E2E-10', 's010-login-register', result)
})

// ---------------------------------------------------------------- B-E2E-11 S-011（异常/边界）

test('B-E2E-11 S-011 登录校验提示与退出登录后的页面反馈仍为可读中文', async ({ page }) => {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page, { loginStatus: 401 })
  await H.goto(page, '/login')
  await page.waitForSelector('form')

  const dialogs = []
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message())
    await dialog.accept()
  })
  await page.fill('input[placeholder="用户名"]', '错误的用户')
  await page.fill('input[placeholder="密码"]', 'wrong-password')
  await page.click('button[type="submit"]')
  for (let i = 0; i < 60 && dialogs.length === 0; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  expect(dialogs.length).toBeGreaterThan(0)
  H.assertReadable(dialogs[0], '登录失败提示')
  H.assertEqual(dialogs[0], '用户名或密码错误', '登录失败提示沿用后端既有业务文案')
  await H.shot(page, 'B-E2E-11', 's011-login-error-dialog')

  await H.prepare(page)
  await H.useIdentity(page, 1)
  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await page.click('.nav a[href="#"], .nav a:has-text("退出")')
  await page.waitForURL('**/login')
  const afterLogout = await H.visibleText(page)
  H.assertReadable(afterLogout, '退出登录后页面文案')
  H.assertContainsAll(afterLogout, H.PAGE_LITERALS.login, '退出后落回登录页固定文案')
  const storage = await page.evaluate(() => ({ userId: window.localStorage.getItem('userId'), username: window.localStorage.getItem('username') }))
  H.assertEqual(storage.userId, null, '退出后本地身份已清除')
  await H.shot(page, 'B-E2E-11', 's011-after-logout')
  H.log('B-E2E-11', 's011-after-logout', { dialogs, afterLogoutText: afterLogout, storage })
})

// ---------------------------------------------------------------- B-E2E-12 S-012（正向）

test('B-E2E-12 S-012 购物车与订单相关四类页面文案可读且商品图片与商品一致', async ({ page }) => {
  const fixtures = H.buildFixtures()
  await page.setViewportSize(VIEWPORT_DESKTOP)
  const state = await H.prepare(page)
  await H.useIdentity(page, 1)
  const result = {}

  await H.goto(page, '/cart')
  await page.waitForSelector('.cart-item')
  const cartImages = await H.settleImages(page)
  const cartText = await H.visibleText(page)
  H.assertReadable(cartText, '购物车页面文案')
  H.assertContainsAll(cartText, state.cart.map(item => item.productName), '购物车商品名')
  expect(cartImages.length).toBe(state.cart.length)
  state.cart.forEach((item, index) => {
    const expected = H.expectedAssetUrl(item.imageUrl)
    H.assert(cartImages[index].src.includes(expected), `购物车第 ${index + 1} 行图片与商品不对应：${cartImages[index].src}`)
    H.assert(cartImages[index].naturalWidth > 0, `购物车第 ${index + 1} 行图片未真实加载`)
    H.assertEqual(cartImages[index].alt, item.productName, `购物车第 ${index + 1} 行 alt 与商品名一致`)
  })
  result.cart = { itemCount: cartImages.length, images: cartImages.map(item => ({ src: item.src, naturalWidth: item.naturalWidth })) }
  await H.shot(page, 'B-E2E-12', 's012-cart')

  await H.goto(page, '/order/confirm')
  await page.waitForSelector('.confirm-page')
  const confirmText = await H.visibleText(page)
  H.assertReadable(confirmText, '订单确认页文案')
  H.assertContainsAll(confirmText, H.PAGE_LITERALS['order-confirm'], '订单确认页可见文案')
  const confirmPlaceholders = await page.$$eval('.confirm-page input', nodes => nodes.map(node => node.getAttribute('placeholder')))
  H.assertContainsAll(confirmPlaceholders.join('|'), H.ORDER_CONFIRM_PLACEHOLDERS, '订单确认收货字段提示文案')
  confirmPlaceholders.forEach(item => H.assertReadable(item, '订单确认收货字段提示文案'))
  H.assertContainsAll(confirmText, state.cart.map(item => item.productName), '订单确认商品名')
  result.orderConfirm = { text: confirmText.replace(/\s+/g, ' ').slice(0, 200), placeholders: confirmPlaceholders }
  await H.shot(page, 'B-E2E-12', 's012-order-confirm')

  await H.goto(page, '/orders')
  await page.waitForSelector('.order-card')
  const ordersText = await H.visibleText(page)
  H.assertReadable(ordersText, '订单列表页文案')
  H.assertContainsAll(ordersText, state.orders.map(order => order.statusText), '订单状态文案（后端既有口径）')
  H.assertContainsAll(ordersText, state.orders.map(order => `¥${order.totalAmount}`), '订单金额按既有口径呈现')
  const orderImageCount = await page.evaluate(() => document.images.length)
  H.assertEqual(orderImageCount, 0, '订单列表页本无图片元素，未新增图片展示')
  result.orders = { statusTexts: state.orders.map(order => order.statusText), imageCount: orderImageCount }
  await H.shot(page, 'B-E2E-12', 's012-orders')

  await H.goto(page, '/order/1001')
  await page.waitForSelector('.detail-page')
  const detailText = await H.visibleText(page)
  H.assertReadable(detailText, '订单详情页文案')
  H.assertContainsAll(detailText, H.PAGE_LITERALS['order-detail'], '订单详情固定文案')
  H.assertContainsAll(detailText, [state.orderDetail.receiverName, state.orderDetail.receiverPhone, state.orderDetail.receiverAddress], '订单收货信息')
  H.assertContainsAll(detailText, state.orderDetail.items.map(item => item.productName), '订单商品名')
  const detailImageCount = await page.evaluate(() => document.images.length)
  H.assertEqual(detailImageCount, 0, '订单详情页本无图片元素，未新增图片展示')
  result.orderDetail = { imageCount: detailImageCount, text: detailText.replace(/\s+/g, ' ').slice(0, 200) }
  await H.shot(page, 'B-E2E-12', 's012-order-detail')

  H.log('B-E2E-12', 's012-cart-orders', result)
})

// ---------------------------------------------------------------- B-E2E-13 S-013（边界）

test('B-E2E-13 S-013 空购物车与无订单记录时空态提示仍为可读中文且入口可操作', async ({ page }) => {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page, { cart: [], orders: [] })
  await H.useIdentity(page, 1)
  const result = {}

  await H.goto(page, '/cart')
  await page.waitForSelector('.empty')
  const cartEmpty = await page.evaluate(() => ({
    text: document.body.innerText,
    emptyText: document.querySelector('.empty').innerText,
    linkText: document.querySelector('.empty a').innerText,
    linkHref: document.querySelector('.empty a').getAttribute('href'),
    imageCount: document.images.length,
    placeholderCount: document.querySelectorAll('.product-image--missing').length
  }))
  H.assertReadable(cartEmpty.text, '空购物车页面文案')
  H.assertContainsAll(cartEmpty.emptyText, ['购物车是空的'], '空购物车既有空态语义')
  H.assertContainsAll(cartEmpty.linkText, ['去购物'], '空购物车入口文案')
  H.assertEqual(cartEmpty.linkHref, '/products', '空购物车入口可操作')
  H.assertEqual(cartEmpty.imageCount, 0, '空态无图片元素，不存在空白图片区')
  H.assertEqual(cartEmpty.placeholderCount, 0, '空态不渲染占位块')
  result.cartEmpty = cartEmpty
  await H.shot(page, 'B-E2E-13', 's013-empty-cart')

  await H.goto(page, '/orders')
  await page.waitForSelector('.empty')
  const ordersEmpty = await page.evaluate(() => ({
    text: document.body.innerText,
    emptyText: document.querySelector('.empty').innerText,
    linkText: document.querySelector('.empty a').innerText,
    linkHref: document.querySelector('.empty a').getAttribute('href'),
    imageCount: document.images.length
  }))
  H.assertReadable(ordersEmpty.text, '无订单页面文案')
  H.assertContainsAll(ordersEmpty.emptyText, ['暂无订单'], '无订单既有空态语义')
  H.assertContainsAll(ordersEmpty.linkText, ['去购物'], '无订单入口文案')
  H.assertEqual(ordersEmpty.linkHref, '/products', '无订单入口可操作')
  H.assertEqual(ordersEmpty.imageCount, 0, '无订单态无图片元素')
  result.ordersEmpty = ordersEmpty
  await H.shot(page, 'B-E2E-13', 's013-empty-orders')

  H.log('B-E2E-13', 's013-empty-states', result)
})

// ---------------------------------------------------------------- B-E2E-14 NFR-001 白天

const PAGE_SWEEP = [
  ['products', '/products', '.product-card'],
  ['detail', '/product/1', '.product-detail'],
  ['cart', '/cart', '.cart-item'],
  ['order-confirm', '/order/confirm', '.confirm-page'],
  ['orders', '/orders', '.order-card'],
  ['order-detail', '/order/1001', '.detail-page'],
  ['login', '/login', 'form'],
  ['register', '/register', 'form']
]

async function sweepEightPages (page, theme) {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)
  await H.useIdentity(page, 1)
  await H.useTheme(page, theme)
  const report = {}
  for (const [key, routePath, selector] of PAGE_SWEEP) {
    await H.goto(page, routePath)
    await page.waitForSelector(selector)
    const info = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      text: document.body.innerText,
      imageCount: document.images.length,
      placeholderCount: document.querySelectorAll('.product-image--missing').length
    }))
    H.assertEqual(info.theme, theme, `${routePath} 根元素 data-theme 应为 ${theme}`)
    H.assertReadable(info.text, `${routePath}（${theme}）可见文案`)
    H.assertContainsAll(info.text, H.PAGE_LITERALS[key], `${routePath}（${theme}）固定文案`)
    let images = []
    if (info.imageCount > 0) {
      images = await H.settleImages(page)
      for (const image of images) {
        H.assert(image.naturalWidth > 0, `${routePath}（${theme}）图片未真实加载：${image.src}`)
      }
    }
    report[key] = { routePath, theme: info.theme, imageCount: info.imageCount, loaded: images.length, textLength: info.text.length }
    await H.shot(page, theme === 'light' ? 'B-E2E-14' : 'B-E2E-15', `${theme}-${key}`)
  }
  return report
}

test('B-E2E-14 NFR-001 八个既有页面在白天模式下文案可读且图片/占位正确', async ({ page }) => {
  const report = await sweepEightPages(page, 'light')
  expect(Object.keys(report).length).toBe(8)
  H.log('B-E2E-14', 'nfr001-light-eight-pages', report)
})

// ---------------------------------------------------------------- B-E2E-15 NFR-001 黑夜

test('B-E2E-15 NFR-001 八个既有页面在黑夜模式下文案可读且图片/占位正确', async ({ page }) => {
  const report = await sweepEightPages(page, 'dark')
  expect(Object.keys(report).length).toBe(8)
  H.log('B-E2E-15', 'nfr001-dark-eight-pages', report)
})

// ---------------------------------------------------------------- B-E2E-16 NFR-004 性能

test('B-E2E-16 NFR-004 主页从打开到可读文案与商品图片呈现完成的耗时不高于缺陷态中位值的两倍', async ({ page }) => {
  const fixtures = H.buildFixtures()
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)

  const measure = async () => {
    const started = Date.now()
    await H.goto(page, '/products')
    await page.waitForSelector('.product-card')
    await page.waitForFunction(() => document.body.innerText.includes('商品分类'), null, { timeout: 15000 })
    await H.settleImages(page)
    return Date.now() - started
  }

  const fixed = []
  for (let i = 0; i < 3; i += 1) fixed.push(await measure())

  // 缺陷等效态：图片请求全部失败（修复前构建产物里 /src/assets/images/*.png 必然 404，页面只剩占位）
  await page.route(url => url.pathname.endsWith('.png'), route => route.abort('failed'))
  const defective = []
  for (let i = 0; i < 3; i += 1) defective.push(await measure())

  const median = values => values.slice().sort((a, b) => a - b)[1]
  const fixedMedian = median(fixed)
  const defectiveMedian = median(defective)
  H.assert(fixedMedian <= defectiveMedian * 2, `主页呈现耗时为缺陷态 ${(fixedMedian / defectiveMedian).toFixed(2)} 倍，超过 NFR-004 的两倍阈值`)
  expect(fixed.length).toBe(3)
  expect(defective.length).toBe(3)

  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)
  await H.shot(page, 'B-E2E-16', 'nfr004-home-timing')
  H.log('B-E2E-16', 'nfr004-home-timing', {
    note: '缺陷等效态以「图片请求全部 abort」模拟修复前 /src/assets/images/*.png 必然 404 的网络画像（同一构建产物、同一数据量）',
    fixedSamplesMs: fixed,
    defectiveSamplesMs: defective,
    fixedMedianMs: fixedMedian,
    defectiveMedianMs: defectiveMedian,
    ratio: Number((fixedMedian / defectiveMedian).toFixed(3)),
    productCount: fixtures.products.length
  })
})

// ---------------------------------------------------------------- B-E2E-17 真实计算几何（CR-04）

test('B-E2E-17 R-002/R-006 真实浏览器计算样式断言三处图片几何与窄屏无横向滚动', async ({ page }) => {
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page)
  await H.useIdentity(page, 1)
  const geometry = {}

  await H.goto(page, '/products')
  await page.waitForSelector('.product-card')
  await H.settleImages(page)
  geometry.list = await page.$eval('.product-card .card-image', node => {
    const style = window.getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    const cardRect = node.closest('.product-card').getBoundingClientRect()
    return {
      computedHeight: style.height,
      computedWidth: style.width,
      objectFit: style.objectFit,
      rectHeight: Math.round(rect.height),
      rectWidth: Math.round(rect.width),
      cardWidth: Math.round(cardRect.width)
    }
  })
  H.assertEqual(geometry.list.computedHeight, '200px', '列表卡片图片区计算高度应为 200px')
  H.assertEqual(geometry.list.rectHeight, 200, '列表卡片图片区真实渲染高度应为 200px')
  H.assertEqual(geometry.list.objectFit, 'cover', '列表卡片图片沿用既有 object-fit: cover')
  H.assert(Math.abs(geometry.list.rectWidth - geometry.list.cardWidth) <= 2, `列表图片宽度未铺满卡片：${JSON.stringify(geometry.list)}`)
  await H.shot(page, 'B-E2E-17', 'geometry-list-200px')

  await H.goto(page, '/product/1')
  await page.waitForSelector('.product-detail')
  await H.settleImages(page)
  geometry.detail = await page.$eval('.product-detail .product-img', node => {
    const style = window.getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return { computedWidth: style.width, computedHeight: style.height, rectWidth: Math.round(rect.width), rectHeight: Math.round(rect.height), aspectRatio: style.aspectRatio }
  })
  H.assertEqual(geometry.detail.rectWidth, 400, '详情主图真实宽度应为 400px')
  H.assertEqual(geometry.detail.rectHeight, 400, '详情主图真实高度应为 400px')
  await H.shot(page, 'B-E2E-17', 'geometry-detail-400')

  await H.goto(page, '/cart')
  await page.waitForSelector('.cart-item')
  await H.settleImages(page)
  geometry.cart = await page.$eval('.cart-item .cart-image', node => {
    const rect = node.getBoundingClientRect()
    return { rectWidth: Math.round(rect.width), rectHeight: Math.round(rect.height) }
  })
  H.assertEqual(geometry.cart.rectWidth, 80, '购物车行图片真实宽度应为 80px')
  H.assertEqual(geometry.cart.rectHeight, 80, '购物车行图片真实高度应为 80px')
  await H.shot(page, 'B-E2E-17', 'geometry-cart-80')

  await page.setViewportSize(VIEWPORT_MOBILE)
  geometry.mobile = {}
  for (const [key, routePath, selector] of [['products', '/products', '.product-card'], ['product-detail', '/product/1', '.product-detail'], ['cart', '/cart', '.cart-item']]) {
    await H.goto(page, routePath)
    await page.waitForSelector(selector)
    await H.settleImages(page)
    const scroll = await H.noHorizontalScroll(page)
    H.assert(scroll.scrollWidth <= scroll.clientWidth, `窄屏 ${routePath} 出现横向滚动：${JSON.stringify(scroll)}`)
    geometry.mobile[key] = scroll
  }
  await H.goto(page, '/product/1')
  await page.waitForSelector('.product-detail')
  await H.settleImages(page)
  geometry.mobile.detailImage = await page.$eval('.product-detail .product-img', node => {
    const rect = node.getBoundingClientRect()
    return { rectWidth: Math.round(rect.width), rectHeight: Math.round(rect.height) }
  })
  H.assert(Math.abs(geometry.mobile.detailImage.rectWidth - geometry.mobile.detailImage.rectHeight) <= 2, `窄屏详情主图未保持方形（aspect-ratio 未生效）：${JSON.stringify(geometry.mobile.detailImage)}`)
  await H.shot(page, 'B-E2E-17', 'geometry-mobile-square')

  H.log('B-E2E-17', 'geometry-computed-styles', geometry)
})

// ---------------------------------------------------------------- B-E2E-18 NFR-003 占位双主题

test('B-E2E-18 NFR-003 图片缺失占位在白天与黑夜两种主题下均可辨识且对比度达标', async ({ page }) => {
  const fixtures = H.buildFixtures()
  const noImage = Object.assign({}, fixtures.products[4], { id: 96, name: '占位对比度核验商品', imageUrl: '' })
  const products = [noImage].concat(fixtures.products)
  await page.setViewportSize(VIEWPORT_DESKTOP)
  await H.prepare(page, { products })
  const result = {}

  for (const theme of ['light', 'dark']) {
    await H.useTheme(page, theme)
    await H.goto(page, '/products')
    await page.waitForSelector('.product-card')
    await H.settleImages(page)
    const sample = await page.$eval('.product-image--missing', node => {
      const style = window.getComputedStyle(node)
      const textNode = node.querySelector('.placeholder-text')
      const textStyle = window.getComputedStyle(textNode)
      return {
        theme: document.documentElement.dataset.theme,
        background: style.backgroundColor,
        borderColor: style.borderColor,
        textColor: textStyle.color,
        text: textNode.innerText,
        ariaLabel: node.getAttribute('aria-label'),
        role: node.getAttribute('role')
      }
    })
    H.assertEqual(sample.theme, theme, `占位所在页面主题应为 ${theme}`)
    H.assert(sample.text.includes('暂无图片'), `${theme} 占位文案应为可读中文`)
    H.assert(sample.ariaLabel.includes(noImage.name), `${theme} 占位 aria-label 应含商品名`)
    const ratio = contrastRatio(sample.textColor, sample.background)
    H.assert(ratio >= 4.5, `${theme} 占位前景/背景对比度 ${ratio.toFixed(2)}:1 低于 4.5:1`)
    result[theme] = { sample, contrastRatio: Number(ratio.toFixed(2)) }
    await H.shot(page, 'B-E2E-18', `placeholder-contrast-${theme}`)
  }
  H.log('B-E2E-18', 'placeholder-contrast', result)
})

// 计算 WCAG 相对亮度与对比度（取 rgb()/rgba() 字符串）。
function contrastRatio (foreground, background) {
  const luminance = value => {
    const parts = String(value).match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
      const normalized = channel / 255
      return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]
  }
  const first = luminance(foreground)
  const second = luminance(background)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}
