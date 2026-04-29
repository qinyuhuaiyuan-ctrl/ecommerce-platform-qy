# 电商平台测试

## 测试报告

测试报告位置：
- **HTML 报告**：`docs/superpowers/tests/playwright-report/index.html`
- **控制台输出**：直接显示在终端

查看报告命令：
```bash
cd docs/superpowers/tests
npx playwright show-report
```

## 运行测试

```bash
# 安装 Playwright 依赖（只需运行一次）
cd frontend
npm install -D @playwright/test
npx playwright install chromium
cd ../docs/superpowers/tests

# 运行所有测试
npx playwright test

# 运行 E2E 测试
npx playwright test e2e.spec.js

# 运行性能测试
npx playwright test performance.spec.js

# 生成 HTML 报告
npx playwright test --html
```

## 测试覆盖

### E2E 测试
- 用户模块：注册、登录成功、登录失败
- 商品模块：列表展示、图片加载、分类筛选、详情页
- 购物车模块：加入购物车、数量修改、删除商品、总价计算
- 订单模块：提交订单、订单列表、订单详情

### 性能测试
- 页面加载时间 < 2s
- API 响应时间 < 500ms
- 无阻塞性错误

## 测试结果

| 类型 | 测试数 | 通过 | 失败 |
|------|--------|------|------|
| E2E | 14 | 14 | 0 |
| 性能 | 3 | 3 | 0 |
| **总计** | **17** | **17** | **0** |
