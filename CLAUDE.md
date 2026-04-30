# 电商平台项目 (ecommerce-platform-qy)

## 项目概述

基于 Vue 3 + Spring Boot 的电商平台，提供用户注册登录、商品浏览、购物车、订单管理等功能。

## 技术栈

| 端 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Axios + Vue Router |
| 后端 | Spring Boot 3.2.0 + MyBatis-Plus + H2 |
| 测试 | Playwright |

## 项目结构

```
Superpower/
├── backend/                    # Spring Boot 后端
│   ├── src/main/java/com/ecommerce/
│   │   ├── controller/        # REST API 控制器
│   │   ├── service/          # 业务逻辑
│   │   ├── mapper/            # 数据访问层
│   │   ├── entity/            # 实体类
│   │   └── dto/               # 数据传输对象
│   └── src/main/resources/
│       ├── application.yml    # 配置
│       ├── schema.sql         # 数据库表结构
│       └── data.sql           # 初始化数据
├── frontend/                   # Vue 3 前端
│   ├── src/
│   │   ├── views/            # 页面组件
│   │   ├── api/              # API 接口
│   │   └── router/           # 路由配置
│   └── package.json
└── docs/superpowers/
    ├── specs/                 # 设计文档
    │   ├── 2026-04-26-ecommerce-platform-design.md
    │   └── 2026-04-29-ecommerce-testing-design.md
    ├── plans/                 # 实现计划
    │   ├── 2026-04-26-ecommerce-platform.md
    │   └── 2026-04-29-ecommerce-testing.md
    └── tests/                 # 测试文件
        ├── e2e.spec.js       # E2E 测试
        ├── performance.spec.js # 性能测试
        └── README.md         # 测试说明
```

## 核心页面

| 路由 | 页面 |
|------|------|
| /login | 登录 |
| /register | 注册 |
| /products | 商品列表 |
| /product/:id | 商品详情 |
| /cart | 购物车 |
| /order/confirm | 订单确认 |
| /orders | 订单列表 |
| /order/:id | 订单详情 |

## 服务启动

```bash
# 后端 (端口 8080)
cd backend
mvn spring-boot:run

# 前端 (端口 5173)
cd frontend
npm run dev
```

## 测试

```bash
cd docs/superpowers/tests
npx playwright test
```

## GitHub 仓库

https://github.com/qinyuhuaiyuan-ctrl/ecommerce-platform-qy

## 开发规范

- 使用 superpower 流程进行开发
- 遵循 TDD 原则
- 保持代码简洁，YAGNI
