import { test, expect } from '@playwright/test';

test.describe('公众号管理页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/account');
    // 等��侧边栏和操作按钮区域加载完成
    await page.waitForSelector('header button', { timeout: 15000 });
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/公众号管理/);
  });

  test('顶部标题栏显示"公众号管理"', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: '公众号管理' })).toBeVisible({ timeout: 10000 });
  });

  test('操作按钮正确渲染', async ({ page }) => {
    await expect(page.getByRole('button', { name: /添加/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /批量导入/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /批量导出/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /删除/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /同步/ })).toBeVisible();
  });

  test('"批量导出"和"删除"和"同步"按钮初始为禁用状态（未选中行）', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /批量导出/ });
    const deleteBtn = page.getByRole('button', { name: /删除/ });
    const syncBtn = page.getByRole('button', { name: /同步/ });

    await expect(exportBtn).toBeDisabled();
    await expect(deleteBtn).toBeDisabled();
    await expect(syncBtn).toBeDisabled();
  });

  test('AG-Grid 表格渲染', async ({ page }) => {
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.ag-header')).toBeVisible();
  });
});
