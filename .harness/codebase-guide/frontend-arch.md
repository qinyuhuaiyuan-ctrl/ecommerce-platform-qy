---
tags: [代码库, 前端]
description: 前端入口、主题控制及样式架构
---
# 前端

`frontend/index.html` 同步加载 `public/theme-init.js`，在 Vue 挂载前设置根元素主题及 color-scheme。`window.__ECOMMERCE_THEME__` 管理系统偏好、手动选择、存储状态和恢复监听；唯一偏好键为 `ecommerce.display.theme.v1`。`src/theme/index.js` 是单一应用级 Vue 订阅适配器，`App.vue` 挂载全局主题工具栏和助手并在卸载时释放；`main.js` 注册 HMR 释放。路由切换不重新创建主题控制器。

`src/styles/theme.css` 提供浅色与深色语义 token；八个路由页面和 FloatingAssistant 使用 token 与窄屏布局。按钮、输入、订单状态与助手渐变采用对应语义色；主题变更不依赖业务请求。商品列表退出仅移除 userId 和 username，不清除其他本地数据。

路由使用 history 和页面懒加载。Vite 将 /api 代理到 localhost:8080。真实浏览器颜色、响应式和交互验收由测试阶段执行。

商品图片链路（sdd-workitem-6 起）：`src/utils/imageSource.js` 的 `resolveProductImage` 用 Vite 内建 `import.meta.glob('../assets/images/*.png', { eager: true, query: '?url', import: 'default' })` 建立「文件名 → 构建产物 URL」映射，把商品数据里既有的 `image_url`（源码树取值 `/src/assets/images/<file>.png`）解析为带 base 前缀的产物地址；空值与未知路径统一收敛为 `{ kind: 'missing', reason }`，函数不抛异常、不发网络请求、不读主题状态。`src/components/ProductImage.vue` 统一承载图片与占位：可渲染时输出带 `alt`、`loading="lazy"` 与显式宽高的 `<img>`；`@error`、空值、未解析三种输入渲染同一套占位块与「暂无图片」文案（`role="img"`、`aria-label` 含商品名），样式只用既有语义 token。列表卡片图片区 200px、详情主图 400×400（窄屏 `aspect-ratio: 1 / 1` 防止占位塌陷）、购物车行 80×80；父级 scoped 选择器改用类选择器（`.card-image`、`.product-img`、`.cart-image`），依赖组件单根节点的 class 透传。订单确认、订单列表、订单详情、登录、注册五页不含图片元素，不接入该组件。

dev 与构建态的路径差异：Vite dev 5173 会直接读取项目根内文件，`/src/assets/images/*.png` 在 dev 下可能偶然可访问，故 dev 表现不能作为图片缺陷已修复的证据；构建产物内只存在 `assets/<name>-<hash>.png`，验证必须走生产构建（入口见 dev-recipes）。
