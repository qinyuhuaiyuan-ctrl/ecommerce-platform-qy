# 电商平台客户端设计文档

**日期：** 2026-04-26

**技术栈：**
- 前端：Vue 3 + Vite
- 后端：Spring Boot + MyBatis-Plus + H2
- 通信：REST API

## 一、系统架构

### 1.1 整体架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端 Vue   │ ──▶ │  Spring Boot │ ──▶ │    H2       │
│  (PC Web)    │     │   REST API   │     │  (嵌入式)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 1.2 前后端交互

- 前端通过 HTTP 请求与后端 REST API 通信
- 后端返回 JSON 数据
- 使用 axios 进行网络请求

## 二、数据库设计

### 2.1 表结构

**用户表 (user)**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password | VARCHAR(100) | 密码（加密存储） |
| phone | VARCHAR(20) | 手机号 |
| create_time | DATETIME | 创建时间 |

**分类表 (category)**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| name | VARCHAR(50) | 分类名称 |
| sort | INT | 排序 |

**商品表 (product)**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| name | VARCHAR(100) | 商品名称 |
| description | VARCHAR(500) | 商品描述 |
| price | DECIMAL(10,2) | 价格 |
| stock | INT | 库存 |
| category_id | BIGINT | 分类ID |
| image_url | VARCHAR(200) | 图片URL |
| status | TINYINT | 状态（1上架/0下架） |
| create_time | DATETIME | 创建时间 |

**购物车表 (cart)**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| user_id | BIGINT | 用户ID |
| product_id | BIGINT | 商品ID |
| quantity | INT | 数量 |
| create_time | DATETIME | 创建时间 |

**订单表 (order)**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键（订单号） |
| user_id | BIGINT | 用户ID |
| total_amount | DECIMAL(10,2) | 总金额 |
| receiver_name | VARCHAR(50) | 收货人姓名 |
| receiver_phone | VARCHAR(20) | 收货人电话 |
| receiver_address | VARCHAR(200) | 收货地址 |
| status | TINYINT | 订单状态 |
| create_time | DATETIME | 创建时间 |
| pay_time | DATETIME | 支付时间 |

**订单明细表 (order_item)**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| order_id | BIGINT | 订单ID |
| product_id | BIGINT | 商品ID |
| product_name | VARCHAR(100) | 商品名称 |
| product_price | DECIMAL(10,2) | 购买单价 |
| quantity | INT | 数量 |
| subtotal | DECIMAL(10,2) | 小计 |

### 2.2 订单状态

| 状态码 | 说明 |
|--------|------|
| 0 | 待支付 |
| 1 | 已支付 |
| 2 | 已发货 |
| 3 | 已完成 |
| 4 | 已取消 |

## 三、前端设计

### 3.1 页面结构

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录页 | /login | 用户登录 |
| 注册页 | /register | 用户注册 |
| 商品列表页 | /products | 分类+商品列表 |
| 商品详情页 | /product/:id | 商品详情 |
| 购物车页 | /cart | 购物车管理 |
| 订单提交页 | /order/confirm | 提交订单 |
| 订单列表页 | /orders | 订单列表 |
| 订单详情页 | /order/:id | 订单详情 |

### 3.2 视觉设计

**主题色：**
- 主色：橙色 (#FF6700，淘宝风格)
- 背景：#F5F5F5
- 白色：#FFFFFF
- 文字：#333333
- 副文字：#999999
- 边框：#E0E0E0

**布局：**
- 固定宽度：1200px（居中）
- 头部高度：60px
- 侧边分类栏：200px
- 商品列表区域：自适应

### 3.3 核心交互

**商品列表页：**
- 左侧分类导航，点击切换商品
- 右侧商品网格展示（4列）
- 点击商品卡片进入详情页
- 点击加入购物车

**购物车页：**
- 商品列表展示
- 修改数量（+、- 按钮）
- 删除商品
- 显示总价
- 去结算按钮

**订单提交页：**
- 购物车商品列表
- 收货信息表单（姓名、电话、地址）
- 显示订单金额
- 提交订单按钮 → 模拟支付弹窗

**订单列表页：**
- 订单卡片展示
- 显示订单号、状态、时间、金额
- 点击查看详情

## 四、后端 API 设计

### 4.1 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/user/register | 注册 |
| POST | /api/user/login | 登录 |

### 4.2 商品接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/categories | 获取所有分类 |
| GET | /api/products | 获取商品列表（可选分类ID） |
| GET | /api/products/{id} | 获取商品详情 |

### 4.3 购物车接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cart | 获取购物车列表 |
| POST | /api/cart | 添加商品到购物车 |
| PUT | /api/cart/{id} | 修改购物车商品数量 |
| DELETE | /api/cart/{id} | 删除购物车商品 |

### 4.4 订单接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/orders | 创建订单 |
| GET | /api/orders | 获取订单列表 |
| GET | /api/orders/{id} | 获取订单详情 |
| PUT | /api/orders/{id}/pay | 模拟支付 |
| PUT | /api/orders/{id}/cancel | 取消订单 |

## 五、安全设计

### 5.1 密码存储

- 使用 BCrypt 加密存储密码
- 登录时验证加密后的密码

### 5.2 接口认证

- 使用拦截器验证登录状态
- 用户ID存放在请求头中

## 六、开发计划

### 阶段一：基础框架搭建
- 创建 Spring Boot 项目
- 配置 MyBatis-Plus + H2
- 创建数据库表

### 阶段二：用户模块
- 用户注册/登录功能
- 后端接口开发

### 阶段三：商品模块
- 分类、商品数据初始化
- 商品列表、详情页
- 后端接口开发

### 阶段四：购物车模块
- 购物车 CRUD
- 后端接口开发

### 阶段五：订单模块
- 订单创建、支付
- 订单列表、详情
- 后端接口开发

### 阶段六：前端开发
- 各页面 Vue 组件开发
- 前后端联调

## 七、预留字段

- 用户表：email（邮箱）
- 商品表：sales（销量）
- 订单表：ship_time（发货时间）、complete_time（完成时间）
