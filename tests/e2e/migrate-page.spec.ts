import { test, expect } from '@playwright/test';

test.describe('数据迁移页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/migrate');
    // 等待迁移按钮出现
    await page.waitForSelector('button', { timeout: 10000 });
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/数据迁移/);
  });

  test('显示迁移按钮', async ({ page }) => {
    await expect(page.getByRole('button', { name: /开始迁移/ })).toBeVisible();
  });

  test('显示全部10张迁移表', async ({ page }) => {
    const tableLabels = ['文章', 'HTML内容', '评论', '评论回复', '元数据', '公众号信息', '图片资源', '资源映射', 'Asset', '调试数据'];
    for (const label of tableLabels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });
});
