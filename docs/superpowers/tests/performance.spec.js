const { test, expect } = require('@playwright/test');

test.describe('性能测试', () => {
  test('页面加载时间 < 2s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:5173/products');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    console.log(`页面加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });

  test('API 响应时间 < 500ms', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:5173/products');
    await page.waitForResponse(response =>
      response.url().includes('api') && response.status() === 200
    );
    const responseTime = Date.now() - startTime;
    console.log(`API 响应时间: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(500);
  });

  test('无阻塞性错误', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173/products');
    await page.waitForTimeout(1000);
    console.log('控制台错误:', errors);
    expect(errors.length).toBe(0);
  });
});
