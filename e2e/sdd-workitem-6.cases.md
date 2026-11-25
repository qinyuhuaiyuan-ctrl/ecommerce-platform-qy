---
tags: [TestCases, GWT, 商品浏览, 乱码修复, 商品图片, 占位语义, quick]
description: sdd-workitem-6 的 B 类验收文本用例，18 条与承载 spec 的 test() 一一对应，覆盖 S-001～S-013 与 NFR-001/NFR-003/NFR-004
---

# sdd-workitem-6 — B 类验收文本用例（GWT）

- 承载 spec：`e2e/sdd-workitem-6.e2e.js`（Testing-only，test-engineer 所有）。
- 用例总数：18，与 spec 的 `test()` 一一对应（第 1 轮官方运行器 `--list` 实测 `Total: 18 tests in 1 file`，见 `.playwright-cli/_tasks/sdd-workitem-6/env-02-collected-cases.log`；第 2 轮在进程内执行器收集到同样的 18 条，见 `.playwright-cli/_tasks/sdd-workitem-6/B-E2E-execution-console.log` 的 `collected 18 test() cases`）。
- 数据来源：`/api/**` 全部由 spec 的 `page.route` 桩应答，fixture 由 `backend/src/main/resources/data.sql` **现场解析**派生（CR-03：不硬编码商品清单与文件名）；页面由 `.playwright-cli/_tasks/sdd-workitem-6/run-cases.cjs` 内置静态服务托管**官方 verify 回执产出的 `frontend/dist`**（构建态）。
- 运行配置：`.playwright-cli/_tasks/sdd-workitem-6/playwright.config.cjs`（testDir 指回本工作项 `e2e/`，单 Chromium、workers:1、retries:0）。
- 证据目录：`.playwright-cli/_tasks/sdd-workitem-6/`，每条用例按 `<B 编号>-<场景 slug>.png`（截图）与 `<B 编号>-<场景 slug>.json`（断言日志）成对落盘。
- 执行状态（第 2 轮真实事实）：18 条**全部在真实 Chromium 中执行**——浏览器由 Project Manager 常驻托管于 `http://127.0.0.1:9336`，本工作项的进程内执行器 `.playwright-cli/_tasks/sdd-workitem-6/run-cases.cjs` 用 `chromium.connectOverCDP` 接管（零 spawn：不起新浏览器、不起 worker 进程），静态服务与 `/api/**` 桩应答都在同一 Node 进程内，执行完只关闭自建 context、不关闭 PM 的浏览器。18 条全部 PASS。证据：`.playwright-cli/_tasks/sdd-workitem-6/B-E2E-execution-console.log`、`.playwright-cli/_tasks/sdd-workitem-6/B-E2E-run-summary.json`、`.playwright-cli/_tasks/sdd-workitem-6/env-05-cdp-inprocess-ready.log`。
- 官方运行器路径（`npx playwright test e2e/sdd-workitem-6.e2e.js`）在本会话仍不可用：Playwright 的 `WorkerHost.startRunner → child_process.fork` 被沙箱拒绝（`Error: spawn EPERM`，第 1 轮已验证，见 `.playwright-cli/_tasks/sdd-workitem-6/env-01-official-runner.log`）。上述两份路径执行的是**同一份用例体**：进程内执行器只注入最小 `@playwright/test` 接口（`test`/`expect`），断言、截图与编号完全来自本文件对应的 `test()`，不存在两套实现。

## 上游依据

- 需求：`requirements.md` R-001～R-006 / S-001～S-013 / NFR-001～NFR-004。
- 方案：`design.md` 第 9 章 T-E2E-01～T-E2E-04、第 11 章验证与验收策略、第 445～449 行补充自验准则第 4 条（三处图片几何与无横向滚动）。
- 审查移交：`code-review.md` CR-03（断言与种子数据交叉）、CR-04（几何需真实计算样式）。

---

### B-E2E-01 — S-001 站点入口跳转的商品列表页全部可见文案以可读中文呈现

- Requirement / Scenario：R-001 / S-001（正向）
- 承载 spec：`e2e/sdd-workitem-6.e2e.js` 中 `test('B-E2E-01 S-001 站点入口跳转的商品列表页全部可见文案以可读中文呈现')`
- Given：用户从未登录状态打开站点根路径 `/`；种子数据含 5 个分类与 10 个商品（`data.sql` 派生）
- When：浏览器按路由根路径重定向进入商品列表页，用户浏览页面标题、导航、侧栏分类、每个商品的名称/描述/价格与按钮
- Then：全部文案为可读中文（无 U+FFFD、无问号方块、无典型误解码字符）；固定文案、5 个分类名、10 条商品名与描述逐字出现；卡片数量与顺序、价格文案与种子数据一致（名称、描述、价格三项均按数组逐项 `toEqual` 比对 `data.sql` 字面量，非子串匹配）；侧栏为「全部分类 + 5 个分类」
- 证据：`.playwright-cli/_tasks/sdd-workitem-6/B-E2E-01-s001-home-readable-text.png` 与 `B-E2E-01-s001-home-readable-text.json`

### B-E2E-02 — S-002 长中文与中英混排文案在桌面与窄屏逐字正确并按既有规则截断

- Requirement / Scenario：R-001 / S-002（边界）
- 承载 spec：`test('B-E2E-02 S-002 长中文与中英混排文案在桌面与窄屏逐字正确并按既有规则截断')`
- Given：商品清单中存在名称与描述较长、含中文标点与中英混排的商品（由桩注入一条 48 字名称 + 中英混排长描述）
- When：分别在桌面 1440×900 与手机窄屏 390×844 下查看该商品的名称与描述
- Then：名称与描述文本与输入逐字一致；描述沿用既有单行排版（`white-space: nowrap` + `text-overflow: ellipsis`）且 `scrollWidth > clientWidth` 说明按既有规则截断；两个视口下均无横向溢出；文案可读
- 证据：`B-E2E-02-s002-long-text-desktop.png`、`B-E2E-02-s002-long-text-mobile.png`、`B-E2E-02-s002-long-text.json`

### B-E2E-03 — S-003 商品描述为空时名称仍可读且其他商品文案与排版不受影响

- Requirement / Scenario：R-001 / S-003（异常/边界）
- 承载 spec：`test('B-E2E-03 S-003 商品描述为空时名称仍可读且其他商品文案与排版不受影响')`
- Given：商品清单中某个商品的描述字段为空（桩注入 `description: ''`）
- When：用户查看该商品所在位置及同页其他商品
- Then：该商品名称仍以可读中文展示，描述渲染为空串且不出现不可读字符或怪异符号；其余商品名称/描述完整可读；含空描述卡片在内的所有卡片图片区高度仍为 200px（排版不受影响）
- 证据：`B-E2E-03-s003-empty-description.png`、`B-E2E-03-s003-empty-description.json`

### B-E2E-04 — S-004 每个商品的图片与自身商品一一对应且真实加载而非占位

- Requirement / Scenario：R-002 / S-004（正向）
- 承载 spec：`test('B-E2E-04 S-004 每个商品的图片与自身商品一一对应且真实加载而非占位')`
- Given：10 个商品在种子数据中各有一份 `imageUrl`（源码树形态），素材在构建产物中各有唯一指纹文件
- When：用户浏览商品清单中的每个商品
- Then：每张卡片图片的 `currentSrc` 指向该商品自身 `imageUrl` 解析出的指纹文件、`naturalWidth > 0`（真实加载，非占位）、`alt` 等于商品名；10 个 `src` 互不相同；无任何 `/src/assets/` 请求；无 PNG 请求失败
- 证据：`B-E2E-04-s004-image-product-mapping.png`、`B-E2E-04-s004-image-product-mapping.json`

### B-E2E-05 — S-005 单个商品图片无法获取时按占位处理且其余商品不受影响

- Requirement / Scenario：R-002 / S-005（异常/边界）
- 承载 spec：`test('B-E2E-05 S-005 单个商品图片无法获取时按占位处理且其余商品不受影响')`
- Given：商品清单中最后一个商品的图片请求被 `route.abort('failed')`，其余 9 张可正常获取
- When：用户浏览商品清单
- Then：可获取图片的 9 个商品仍真实加载（`naturalWidth > 0`）；失败商品展示统一占位且含可读中文「暂无图片」；全页仅 1 处占位（未扩散）；整页文案可读且 10 个商品名完整呈现
- 证据：`B-E2E-05-s005-single-image-abort.png`、`B-E2E-05-s005-single-image-abort.json`

### B-E2E-06 — S-006 无图片信息的商品展示统一占位与可读中文说明且不遮挡名称价格

- Requirement / Scenario：R-003 / S-006（正向）
- 承载 spec：`test('B-E2E-06 S-006 无图片信息的商品展示统一占位与可读中文说明且不遮挡名称价格')`
- Given：商品清单中存在 `imageUrl` 为空的商品（桩注入 `imageUrl: ''`）
- When：用户浏览该商品所在位置
- Then：该商品图片区域展示统一占位（`class="product-image product-image--missing"`、`role="img"`、`aria-label` 含商品名），占位内含可读中文「暂无图片」；占位块高度仍为 200px 未塌陷；商品名称与价格照常可读；全页仅 1 处占位
- 证据：`B-E2E-06-s006-no-image-placeholder.png`、`B-E2E-06-s006-no-image-placeholder.json`

### B-E2E-07 — S-007 原本可见的图片随后无法获取时列表页与详情页复用同一套占位

- Requirement / Scenario：R-003 / S-007（异常/边界）
- 承载 spec：`test('B-E2E-07 S-007 原本可见的图片随后无法获取时列表页与详情页复用同一套占位')`
- Given：某商品图片首次可正常展示（前置断言 `naturalWidth > 0`）；随后该图片请求被 abort
- When：用户再次打开包含该商品的主页，再打开该商品详情页
- Then：列表页该商品展示占位；详情页占位的**组件自有 class 集合**（`product-image product-image--missing`）与列表页完全一致、文案完全一致（「暂无图片」），`aria-label` 含商品名、`role="img"`；父级传入的布局 class（`card-image` / `product-img`）只承载各视图自身几何尺寸，不纳入占位语义比较；同一用例另以「`imageUrl` 为空」的商品作对照，验证**加载失败分支与数据为空分支**落在同一套组件 class 与同一段文案上（CR-05 闭合）；两页均无空白区域/破图标识/不可读字符，其余文案照常可读
- 证据：`B-E2E-07-s007-image-lost-placeholder.png`、`B-E2E-07-s007-image-lost-placeholder.json`

### B-E2E-08 — S-008 从列表进入详情页展示同一商品的同一张图片与同一套中文信息

- Requirement / Scenario：R-004 / S-008（正向）
- 承载 spec：`test('B-E2E-08 S-008 从列表进入详情页展示同一商品的同一张图片与同一套中文信息')`
- Given：用户在主页看到某商品
- When：用户点击该商品卡片进入详情页
- Then：详情页图片 `currentSrc` 与列表页完全相同且指向该商品的构建产物指纹文件、`naturalWidth > 0`；名称/描述/价格与列表页逐字一致；库存文案与数据一致；详情页文案可读
- 证据：`B-E2E-08-s008-list-to-detail-consistent.png`、`B-E2E-08-s008-list-to-detail-consistent.json`

### B-E2E-09 — S-009 直达商品详情页文案可读且图片不可获取时复用同一占位

- Requirement / Scenario：R-004 / S-009（异常/边界）
- 承载 spec：`test('B-E2E-09 S-009 直达商品详情页文案可读且图片不可获取时复用同一占位')`
- Given：用户不经过主页直接访问 `/product/{id}`
- When：分别在图片可获取与图片被 abort 两种情况下查看详情页
- Then：两种情况下页面文案均可读、商品名称与价格正确；图片可获取时正常展示（`naturalWidth > 0`）；不可获取时显示与列表页相同的占位（含「暂无图片」与含商品名的 `aria-label`），占位块宽高均大于 300px（未塌陷为空白区）
- 证据：`B-E2E-09-s009-direct-detail-placeholder.png`、`B-E2E-09-s009-direct-detail-placeholder.json`

### B-E2E-10 — S-010 登录页与注册页文案可读且页面图形元素正常呈现

- Requirement / Scenario：R-005 / S-010（正向）
- 承载 spec：`test('B-E2E-10 S-010 登录页与注册页文案可读且页面图形元素正常呈现')`
- Given：用户分别打开登录页与注册页（本次零源码改动）
- When：用户查看标题、表单标签、按钮、提示、输入框占位文案与页面图形元素
- Then：两页文案均为可读中文且含固定文案（登录/还没有账号/立即注册；注册/已有账号/立即登录）；输入框占位为可读中文（用户名/密码/手机号）；页面没有任何图片元素与占位块（`document.images.length === 0`），不引入新的图片缺失；主题工具栏按钮文案可读；无 PNG 请求失败
- 证据：`B-E2E-10-s010-login-readable.png`、`B-E2E-10-s010-register-readable.png`、`B-E2E-10-s010-login-register.json`

### B-E2E-11 — S-011 登录校验提示与退出登录后的页面反馈仍为可读中文

- Requirement / Scenario：R-005 / S-011（异常/边界）
- 承载 spec：`test('B-E2E-11 S-011 登录校验提示与退出登录后的页面反馈仍为可读中文')`
- Given：用户提交不符合要求的登录凭据（桩返回 400 语义的自定义提示），随后在已登录状态下退出登录
- When：用户查看校验提示与退出登录后的页面反馈
- Then：提示为可读中文且沿用既有业务文案（「用户名或密码错误」）；退出后落回登录页且文案可读、固定文案齐全；本地身份（userId/username）已清除；业务结果语义未因本次修复改变
- 证据：`B-E2E-11-s011-login-error-dialog.png`、`B-E2E-11-s011-after-logout.png`、`B-E2E-11-s011-after-logout.json`

### B-E2E-12 — S-012 购物车与订单相关四类页面文案可读且商品图片与商品一致

- Requirement / Scenario：R-006 / S-012（正向）
- 承载 spec：`test('B-E2E-12 S-012 购物车与订单相关四类页面文案可读且商品图片与商品一致')`
- Given：用户已将 2 个商品加入购物车并拥有 2 条订单记录（桩数据口径取自后端 DTO）
- When：用户依次查看购物车、订单确认、订单列表与订单详情
- Then：四页文案均可读且固定文案齐全（订单确认页的收货三项以 `OrderConfirm.vue` 中真实存在的输入框 `placeholder` 断言，不虚构 innerText）；购物车 2 行图片 `currentSrc` 指向各自商品的指纹文件、`naturalWidth > 0`、`alt` 等于商品名；订单状态文案沿用后端既有口径（待支付/已支付）；订单金额按既有口径呈现；订单列表与详情页本无图片元素，`document.images.length === 0`（未新增图片展示）
- 证据：`B-E2E-12-s012-cart.png`、`B-E2E-12-s012-order-confirm.png`、`B-E2E-12-s012-orders.png`、`B-E2E-12-s012-order-detail.png`、`B-E2E-12-s012-cart-orders.json`

### B-E2E-13 — S-013 空购物车与无订单记录时空态提示仍为可读中文且入口可操作

- Requirement / Scenario：R-006 / S-013（异常/边界）
- 承载 spec：`test('B-E2E-13 S-013 空购物车与无订单记录时空态提示仍为可读中文且入口可操作')`
- Given：购物车为空且用户没有订单记录（桩返回空数组）
- When：用户查看购物车页与订单列表页
- Then：空态文案为可读中文（「购物车是空的」/「暂无订单」），并给出可操作的「去购物」入口（`href="/products"`）；两页 `document.images.length === 0` 且无占位块，不存在空白图片区
- 证据：`B-E2E-13-s013-empty-cart.png`、`B-E2E-13-s013-empty-orders.png`、`B-E2E-13-s013-empty-states.json`

### B-E2E-14 — NFR-001 八个既有页面在白天模式下文案可读且图片/占位正确

- Requirement / Scenario：NFR-001（S-001～S-013 的跨页一致性，design 第 11 章「双主题 16 组合」的白天一半）
- 承载 spec：`test('B-E2E-14 NFR-001 八个既有页面在白天模式下文案可读且图片/占位正确')`
- Given：本地主题偏好被预先置为白天（`localStorage['ecommerce.display.theme.v1'] = 'light'`）
- When：依次打开商品列表、商品详情、购物车、订单确认、订单列表、订单详情、登录、注册八个页面
- Then：每页根元素 `data-theme === 'light'`；每页文案可读且含该页固定文案；凡有图片元素的页面，全部图片 `naturalWidth > 0`；八页均无不可读字符
- 证据：`.playwright-cli/_tasks/sdd-workitem-6/B-E2E-14-light-<page>.png`（8 张）、`B-E2E-14-nfr001-light-eight-pages.json`

### B-E2E-15 — NFR-001 八个既有页面在黑夜模式下文案可读且图片/占位正确

- Requirement / Scenario：NFR-001（双主题 16 组合的黑夜一半）
- 承载 spec：`test('B-E2E-15 NFR-001 八个既有页面在黑夜模式下文案可读且图片/占位正确')`
- Given：本地主题偏好被预先置为黑夜（`localStorage['ecommerce.display.theme.v1'] = 'dark'`）
- When：依次打开同样八个页面
- Then：每页根元素 `data-theme === 'dark'`；文案与图片表现与白天一致无回归；八页均无不可读字符
- 证据：`.playwright-cli/_tasks/sdd-workitem-6/B-E2E-15-dark-<page>.png`（8 张）、`B-E2E-15-nfr001-dark-eight-pages.json`

### B-E2E-16 — NFR-004 主页从打开到可读文案与商品图片呈现完成的耗时不高于缺陷态中位值的两倍

- Requirement / Scenario：NFR-004（design 第 11 章性能行）
- 承载 spec：`test('B-E2E-16 NFR-004 主页从打开到可读文案与商品图片呈现完成的耗时不高于缺陷态中位值的两倍')`
- Given：同一构建产物、同一数据量（10 商品）；「缺陷态」以「图片请求全部 abort」模拟修复前 `/src/assets/images/*.png` 必然 404 的网络画像
- When：修复态与缺陷态各测 3 次，从打开主页到「商品分类文案出现 + 全部图片载入完成」计时，取中位值
- Then：修复态中位值 ≤ 缺陷态中位值 × 2；日志中如实记录 6 个原始样本、中位值与比值
- 证据：`B-E2E-16-nfr004-home-timing.png`、`B-E2E-16-nfr004-home-timing.json`

### B-E2E-17 — R-002/R-006 真实浏览器计算样式断言三处图片几何与窄屏无横向滚动

- Requirement / Scenario：R-002 / R-006 与 design 第 445～449 行补充自验准则第 4 条（闭合 CR-04）
- 承载 spec：`test('B-E2E-17 R-002/R-006 真实浏览器计算样式断言三处图片几何与窄屏无横向滚动')`
- Given：桌面 1440×900 与窄屏 390×844 两个视口
- When：在真实浏览器中读取 `getComputedStyle` 与 `getBoundingClientRect`
- Then：列表卡片图片区计算高度 `200px`、真实渲染高度 200px、`object-fit: cover`、宽度铺满卡片（差值 ≤ 2px）；详情主图真实渲染 400×400；购物车行图片 80×80；窄屏下商品列表/详情/购物车三页 `scrollWidth ≤ clientWidth`（无横向滚动）；窄屏详情主图宽高差 ≤ 2px（保持方形）
- 证据：`B-E2E-17-geometry-list-200px.png`、`B-E2E-17-geometry-detail-400.png`、`B-E2E-17-geometry-cart-80.png`、`B-E2E-17-geometry-mobile-square.png`、`B-E2E-17-geometry-computed-styles.json`

### B-E2E-18 — NFR-003 图片缺失占位在白天与黑夜两种主题下均可辨识且对比度达标

- Requirement / Scenario：NFR-003 与 R-003（占位语义在双主题下的一致性）
- 承载 spec：`test('B-E2E-18 NFR-003 图片缺失占位在白天与黑夜两种主题下均可辨识且对比度达标')`
- Given：商品清单中存在 `imageUrl` 为空的商品；分别在白天与黑夜主题下打开列表页
- When：检查占位块主题、文案、可辨识语义与前景/背景对比度
- Then：占位所在页 `data-theme` 与目标主题一致；占位文案为可读中文「暂无图片」；`aria-label` 含商品名；按 WCAG 相对亮度计算的对比度 ≥ 4.5:1（两主题各自达标）
- 证据：`B-E2E-18-placeholder-contrast-light.png`、`B-E2E-18-placeholder-contrast-dark.png`、`B-E2E-18-placeholder-contrast.json`

---

## 文本用例 ↔ spec `test()` 对照

| B 编号 | R/S | 文本用例 | spec 中对应 `test()` 标题（逐字） | 第 2 轮执行结果 |
|---|---|---|---|---|
| B-E2E-01 | R-001/S-001 | 本文件「B-E2E-01 — S-001」 | `B-E2E-01 S-001 站点入口跳转的商品列表页全部可见文案以可读中文呈现` | PASS |
| B-E2E-02 | R-001/S-002 | 本文件「B-E2E-02 — S-002」 | `B-E2E-02 S-002 长中文与中英混排文案在桌面与窄屏逐字正确并按既有规则截断` | PASS |
| B-E2E-03 | R-001/S-003 | 本文件「B-E2E-03 — S-003」 | `B-E2E-03 S-003 商品描述为空时名称仍可读且其他商品文案与排版不受影响` | PASS |
| B-E2E-04 | R-002/S-004 | 本文件「B-E2E-04 — S-004」 | `B-E2E-04 S-004 每个商品的图片与自身商品一一对应且真实加载而非占位` | PASS |
| B-E2E-05 | R-002/S-005 | 本文件「B-E2E-05 — S-005」 | `B-E2E-05 S-005 单个商品图片无法获取时按占位处理且其余商品不受影响` | PASS |
| B-E2E-06 | R-003/S-006 | 本文件「B-E2E-06 — S-006」 | `B-E2E-06 S-006 无图片信息的商品展示统一占位与可读中文说明且不遮挡名称价格` | PASS |
| B-E2E-07 | R-003/S-007 | 本文件「B-E2E-07 — S-007」 | `B-E2E-07 S-007 原本可见的图片随后无法获取时列表页与详情页复用同一套占位` | PASS |
| B-E2E-08 | R-004/S-008 | 本文件「B-E2E-08 — S-008」 | `B-E2E-08 S-008 从列表进入详情页展示同一商品的同一张图片与同一套中文信息` | PASS |
| B-E2E-09 | R-004/S-009 | 本文件「B-E2E-09 — S-009」 | `B-E2E-09 S-009 直达商品详情页文案可读且图片不可获取时复用同一占位` | PASS |
| B-E2E-10 | R-005/S-010 | 本文件「B-E2E-10 — S-010」 | `B-E2E-10 S-010 登录页与注册页文案可读且页面图形元素正常呈现` | PASS |
| B-E2E-11 | R-005/S-011 | 本文件「B-E2E-11 — S-011」 | `B-E2E-11 S-011 登录校验提示与退出登录后的页面反馈仍为可读中文` | PASS |
| B-E2E-12 | R-006/S-012 | 本文件「B-E2E-12 — S-012」 | `B-E2E-12 S-012 购物车与订单相关四类页面文案可读且商品图片与商品一致` | PASS |
| B-E2E-13 | R-006/S-013 | 本文件「B-E2E-13 — S-013」 | `B-E2E-13 S-013 空购物车与无订单记录时空态提示仍为可读中文且入口可操作` | PASS |
| B-E2E-14 | NFR-001 | 本文件「B-E2E-14」 | `B-E2E-14 NFR-001 八个既有页面在白天模式下文案可读且图片/占位正确` | PASS |
| B-E2E-15 | NFR-001 | 本文件「B-E2E-15」 | `B-E2E-15 NFR-001 八个既有页面在黑夜模式下文案可读且图片/占位正确` | PASS |
| B-E2E-16 | NFR-004 | 本文件「B-E2E-16」 | `B-E2E-16 NFR-004 主页从打开到可读文案与商品图片呈现完成的耗时不高于缺陷态中位值的两倍` | PASS |
| B-E2E-17 | R-002/R-006 | 本文件「B-E2E-17」 | `B-E2E-17 R-002/R-006 真实浏览器计算样式断言三处图片几何与窄屏无横向滚动` | PASS |
| B-E2E-18 | NFR-003 | 本文件「B-E2E-18」 | `B-E2E-18 NFR-003 图片缺失占位在白天与黑夜两种主题下均可辨识且对比度达标` | PASS |

- 文本用例数：18
- spec `test()` 数：18
- 对照行数：18
- 是否 1:1：是（`B-E2E-01`～`B-E2E-18` 编号与标题逐字对应；表中 `test()` 标题与本文件各小节「承载 spec」行引用的是同一字符串，逐条执行结果见 `.playwright-cli/_tasks/sdd-workitem-6/B-E2E-run-summary.json`）
