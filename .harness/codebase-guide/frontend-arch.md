---
tags: [代码库, 前端]
description: 前端入口、主题控制及样式架构
---
# 前端

`frontend/index.html` 同步加载 `public/theme-init.js`，在 Vue 挂载前设置根元素主题及 color-scheme。`window.__ECOMMERCE_THEME__` 管理系统偏好、手动选择、存储状态和恢复监听；唯一偏好键为 `ecommerce.display.theme.v1`。`src/theme/index.js` 是单一应用级 Vue 订阅适配器，`App.vue` 挂载全局主题工具栏和助手并在卸载时释放；`main.js` 注册 HMR 释放。路由切换不重新创建主题控制器。

`src/styles/theme.css` 提供浅色与深色语义 token；八个路由页面和 FloatingAssistant 使用 token 与窄屏布局。按钮、输入、订单状态与助手渐变采用对应语义色；主题变更不依赖业务请求。商品列表退出仅移除 userId 和 username，不清除其他本地数据。

路由使用 history 和页面懒加载。Vite 将 /api 代理到 localhost:8080。真实浏览器颜色、响应式和交互验收由测试阶段执行。
