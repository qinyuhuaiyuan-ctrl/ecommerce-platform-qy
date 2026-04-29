const { test, expect } = require('@playwright/test');

test.describe('用户模块', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `testuser${timestamp}`,
    password: 'Test123456',
    phone: '13800138000'
  };

  test('用户注册', async ({ page }) => {
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="用户名"]', testUser.username);
    await page.fill('input[placeholder="密码"]', testUser.password);
    await page.fill('input[placeholder="手机号"]', testUser.phone);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*login/);
  });

  test('用户登录成功', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder="用户名"]', testUser.username);
    await page.fill('input[placeholder="密码"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*products/, { timeout: 10000 });
  });

  test('用户登录失败 - 密码错误', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder="用户名"]', testUser.username);
    await page.fill('input[placeholder="密码"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    expect(dialogMessage).toContain('失败');
  });
});

test.describe('商品模块', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `testuser${timestamp}`,
    password: 'Test123456'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[placeholder="用户名"]', testUser.username);
    await page.fill('input[placeholder="密码"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*products/);
  });

  test('商品列表展示', async ({ page }) => {
    await page.goto('http://localhost:5173/products');
    const products = await page.locator('.product-card').count();
    expect(products).toBeGreaterThan(0);
  });

  test('商品图片加载', async ({ page }) => {
    await page.goto('http://localhost:5173/products');
    const firstImage = page.locator('.product-card img').first();
    await expect(firstImage).toBeVisible();
    const src = await firstImage.getAttribute('src');
    expect(src).toContain('.png');
  });

  test('分类筛选', async ({ page }) => {
    await page.goto('http://localhost:5173/products');
    const categories = await page.locator('.sidebar li').count();
    expect(categories).toBeGreaterThan(0);
    await page.locator('.sidebar li').nth(1).click();
    await page.waitForTimeout(500);
  });

  test('商品详情页', async ({ page }) => {
    await page.goto('http://localhost:5173/products');
    await page.locator('.product-card').first().click();
    await expect(page).toHaveURL(/.*product\/\d+/);
    await expect(page.locator('.price')).toBeVisible();
  });
});
