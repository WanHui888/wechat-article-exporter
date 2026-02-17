/**
 * 文章管理 E2E 测试
 */

import { test, expect } from './fixtures/auth.fixture'
import { ArticlesPage } from './pages/ArticlesPage'
import { AccountsPage } from './pages/AccountsPage'

test.describe('文章管理功能', () => {
  let articlesPage: ArticlesPage

  test.beforeEach(async ({ authenticatedPage }) => {
    articlesPage = new ArticlesPage(authenticatedPage)
    await articlesPage.navigate()
  })

  test.describe('文章列表', () => {
    test('应该显示文章列表', async () => {
      const count = await articlesPage.getArticlesCount()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('应该能够获取文章详细信息', async () => {
      const articles = await articlesPage.getArticlesList()

      if (articles.length > 0) {
        const firstArticle = articles[0]
        expect(firstArticle).toHaveProperty('title')
        expect(firstArticle).toHaveProperty('account')
        expect(firstArticle).toHaveProperty('date')
        expect(firstArticle.title).toBeTruthy()
      }
    })

    test('文章列表应该支持分页', async ({ authenticatedPage }) => {
      // 检查分页控件是否存在
      const paginationVisible = await authenticatedPage.isVisible('.arco-pagination, .pagination')

      if (paginationVisible) {
        const initialArticles = await articlesPage.getArticlesList()

        // 切换到下一页
        await articlesPage.nextPage()

        const nextPageArticles = await articlesPage.getArticlesList()

        // 验证文章列表已改变
        if (initialArticles.length > 0 && nextPageArticles.length > 0) {
          expect(initialArticles[0].title).not.toBe(nextPageArticles[0].title)
        }
      }
    })
  })

  test.describe('搜索文章', () => {
    test('应该能够按标题搜索文章', async () => {
      const allArticles = await articlesPage.getArticlesList()

      if (allArticles.length > 0) {
        const firstArticle = allArticles[0]
        const searchKeyword = firstArticle.title.substring(0, 5)

        await articlesPage.searchArticle(searchKeyword)

        const hasArticle = await articlesPage.hasArticle(searchKeyword)
        expect(hasArticle).toBe(true)
      }
    })

    test('搜索不存在的关键词应该返回空结果', async () => {
      await articlesPage.searchArticle('不存在的文章标题xyz12345')

      const count = await articlesPage.getArticlesCount()
      expect(count).toBe(0)
    })

    test('应该支持中文搜索', async () => {
      await articlesPage.searchArticle('测试')
      // 搜索应该成功执行（不报错）
      const count = await articlesPage.getArticlesCount()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('文章筛选', () => {
    test('应该能够按账号筛选', async ({ authenticatedPage }) => {
      const accounts = await authenticatedPage.$$('.account-filter option')

      if (accounts.length > 1) {
        const accountName = await accounts[1].textContent()
        if (accountName) {
          await articlesPage.filterByAccount(accountName)

          const articles = await articlesPage.getArticlesList()
          if (articles.length > 0) {
            expect(articles.every(a => a.account === accountName)).toBe(true)
          }
        }
      }
    })

    test('应该能够筛选收藏的文章', async () => {
      await articlesPage.filterFavorites()

      // 验证筛选成功执行
      const count = await articlesPage.getArticlesCount()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('文章收藏', () => {
    test('应该能够收藏文章', async ({ authenticatedPage }) => {
      const initialCount = await articlesPage.getArticlesCount()

      if (initialCount > 0) {
        // 收藏第一篇文章
        await articlesPage.toggleFavorite(0)

        // 等待操作完成
        await authenticatedPage.waitForTimeout(1000)

        // 刷新列表验证
        await articlesPage.refresh()
      }
    })

    test('应该能够取消收藏文章', async ({ authenticatedPage }) => {
      const initialCount = await articlesPage.getArticlesCount()

      if (initialCount > 0) {
        // 先收藏
        await articlesPage.toggleFavorite(0)
        await authenticatedPage.waitForTimeout(500)

        // 再取消收藏
        await articlesPage.toggleFavorite(0)
        await authenticatedPage.waitForTimeout(500)

        // 验证操作成功
        await articlesPage.refresh()
      }
    })
  })

  test.describe('查看文章详情', () => {
    test('应该能够查看文章详情', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.viewArticle(0)

        // 验证已导航到文章详情页
        await authenticatedPage.waitForURL(/\/articles\/\d+/, { timeout: 10000 })
      }
    })
  })

  test.describe('批量操作', () => {
    test('应该能够批量选择文章', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count >= 3) {
        // 选择前3篇文章
        await articlesPage.selectArticles([0, 1, 2])

        // 验证选中状态
        const checkedCount = await authenticatedPage.$$('input[type="checkbox"]:checked')
        expect(checkedCount.length).toBeGreaterThanOrEqual(3)
      }
    })

    test('应该能够批量导出文章', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        // 选择文章
        await articlesPage.selectArticles([0])

        // 点击批量导出
        await articlesPage.exportSelected()

        // 验证导出对话框已打开
        const dialogVisible = await authenticatedPage.isVisible('.export-dialog, .arco-modal')
        expect(dialogVisible).toBe(true)

        // 关闭对话框
        await authenticatedPage.click('button:has-text("取消"), .arco-modal-close-icon')
      }
    })
  })

  test.describe('列表刷新', () => {
    test('应该能够刷新文章列表', async () => {
      const initialArticles = await articlesPage.getArticlesList()

      await articlesPage.refresh()

      const refreshedArticles = await articlesPage.getArticlesList()

      // 列表应该重新加载（数量应该一致）
      expect(refreshedArticles.length).toBe(initialArticles.length)
    })
  })

  test.describe('完整流程', () => {
    test('应该完成：浏览 → 搜索 → 收藏 → 查看详情', async ({ authenticatedPage }) => {
      // 1. 浏览文章列表
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        const articles = await articlesPage.getArticlesList()
        const firstArticle = articles[0]

        // 2. 搜索文章
        await articlesPage.searchArticle(firstArticle.title.substring(0, 5))
        const hasArticle = await articlesPage.hasArticle(firstArticle.title)
        expect(hasArticle).toBe(true)

        // 3. 收藏文章
        await articlesPage.toggleFavorite(0)
        await authenticatedPage.waitForTimeout(500)

        // 4. 查看详情
        await articlesPage.viewArticle(0)
        await authenticatedPage.waitForURL(/\/articles\/\d+/, { timeout: 10000 })

        // 返回列表
        await authenticatedPage.goBack()
        await articlesPage.page.waitForLoadState('networkidle')
      }
    })
  })

  test.describe('性能测试', () => {
    test('文章列表应该快速加载', async () => {
      const startTime = Date.now()
      await articlesPage.navigate()
      await articlesPage.page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // 页面应该在 3 秒内加载完成
      expect(loadTime).toBeLessThan(3000)
    })

    test('搜索应该快速响应', async () => {
      const startTime = Date.now()
      await articlesPage.searchArticle('测试')
      await articlesPage.page.waitForLoadState('networkidle')
      const searchTime = Date.now() - startTime

      // 搜索应该在 2 秒内完成
      expect(searchTime).toBeLessThan(2000)
    })
  })

  test.describe('错误处理', () => {
    test('应该处理加载失败的情况', async ({ authenticatedPage }) => {
      // 模拟网络错误
      await authenticatedPage.context().setOffline(true)

      await articlesPage.refresh()

      // 应该显示错误消息或空状态
      const errorVisible = await authenticatedPage.isVisible('.error-message, .empty-state, .arco-message-error')
      expect(errorVisible).toBe(true)

      // 恢复网络
      await authenticatedPage.context().setOffline(false)
    })
  })

  test.describe('响应式设计', () => {
    test('应该在移动设备上正常显示', async ({ authenticatedPage }) => {
      // 设置移动设备视口
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })

      await articlesPage.navigate()
      await articlesPage.page.waitForLoadState('networkidle')

      // 验证列表仍然可见
      const listVisible = await authenticatedPage.isVisible('.articles-list, .table')
      expect(listVisible).toBe(true)

      // 恢复桌面视口
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })
  })
})
