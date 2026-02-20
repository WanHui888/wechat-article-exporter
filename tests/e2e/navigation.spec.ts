import { test, expect } from '@playwright/test';

test.describe('页面导航', () => {
  test('访问根路径自动跳转到公众号管理页', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard/account', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard/account');
  });

  test('侧边栏显示网站名称和导航菜单', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.waitForSelector('aside', { timeout: 10000 });

    // 网站名称
    await expect(page.locator('aside').getByText('公众号文章导出')).toBeVisible();

    // 导航菜单项（exact: true 防止子字符串匹配）
    await expect(page.getByRole('link', { name: '公众号管理', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '文章下载', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '单篇文章下载', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '合集下载', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '公共代理', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '设置', exact: true })).toBeVisible();
  });

  test('点击"文章下载"导航到文章下载页', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.waitForSelector('aside', { timeout: 10000 });
    await page.getByRole('link', { name: '文章下载', exact: true }).click();
    await page.waitForURL('**/dashboard/article', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard/article');
  });

  test('点击"设置"导航到设置页', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.waitForSelector('aside', { timeout: 10000 });
    await page.getByRole('link', { name: '设置', exact: true }).click();
    await page.waitForURL('**/dashboard/settings', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard/settings');
  });
});
