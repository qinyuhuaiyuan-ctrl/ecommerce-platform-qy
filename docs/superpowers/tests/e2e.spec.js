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

test.describe('购物车模块', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `testuser${timestamp}`,
    password: 'Test123456',
    phone: '13800138000'
  };

  test.beforeEach(async ({ page }) => {
    // 处理注册和登录过程中的对话框
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // 先注册用户
    await page.goto('http://localhost:5173/register');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="用户名"]', testUser.username);
    await page.fill('input[placeholder="密码"]', testUser.password);
    await page.fill('input[placeholder="手机号"]', testUser.phone);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*login/, { timeout: 10000 });

    // 然后登录
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="用户名"]', testUser.username);
    await page.fill('input[placeholder="密码"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*products/, { timeout: 10000 });
  });

  test('加入购物车', async ({ page }) => {
    await page.goto('http://localhost:5173/products');
    await page.locator('.btn-add').first().click();
    await page.waitForTimeout(500);
    await page.goto('http://localhost:5173/cart');
    const cartItems = await page.locator('.cart-item').count();
    expect(cartItems).toBeGreaterThan(0);
  });

  test('修改购物车数量', async ({ page }) => {
    await page.goto('http://localhost:5173/cart');
    const increaseBtn = page.locator('.quantity .btn-increase').first();
    await increaseBtn.click();
    await page.waitForTimeout(500);
  });

  test('删除购物车商品', async ({ page }) => {
    await page.goto('http://localhost:5173/cart');
    const deleteBtn = page.locator('.btn-delete').first();
    await deleteBtn.click();
    await page.waitForTimeout(500);
  });

  test('总价计算', async ({ page }) => {
    await page.goto('http://localhost:5173/cart');
    await page.locator('.btn-add').first().click();
    await page.waitForTimeout(500);
    await page.goto('http://localhost:5173/cart');
    const totalText = await page.locator('.total-price').textContent();
    expect(totalText).toContain('¥');
  });
});
