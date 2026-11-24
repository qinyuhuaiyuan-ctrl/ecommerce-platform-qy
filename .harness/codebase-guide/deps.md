---
tags: [代码库, 依赖]
description: 依赖清单声明，非安装状态证明
---
# 依赖

frontend/package.json：Vue ^3.4、Vue Router ^4.2.5、Axios ^1.6；Vite ^5、Vue 插件 ^5、@playwright/test ^1.59.1。sdd-workitem-5 的 W-01 已增加固定开发依赖 vitest 2.1.9、@vue/test-utils 2.4.6、jsdom 25.0.1，安装由 PM 恢复后经本轮 npm ls 真实复核（Vite 5.4.21）。新增 test 和 test:unit 均运行 vitest run --config vitest.config.js；没有 test:all。配置只收集 tests/unit/**/*.test.js，使用 Vue 插件与 jsdom；没有收集 E2E。先前 esbuild spawn EPERM 已恢复；本轮 Vitest 目标测试已真实运行，详细结果见开发日志。

backend/pom.xml：Spring Web、Validation、MyBatis-Plus、H2、Lombok、Spring Boot Test。已发现助手 DTO/service 测试文件。

本轮 Node v24.18.0，固定前端依赖已核验；工作区便携 JDK17/Maven3.9.9 的版本可用性由 PM 核验，实际项目回归结果另见当前 dev-log。Chromium 未核验，未运行 Playwright。npm audit --json 实际返回 18 项告警（7 moderate、9 high、2 critical，exit 1），包括开发测试工具与既有运行时依赖链；未自动修复、升级或声明全部无影响，具体可达性需 CR 独立评估。不得沿用其他项目的 FastAPI/Node 后端验证结论。
