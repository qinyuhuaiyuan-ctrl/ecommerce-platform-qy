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
