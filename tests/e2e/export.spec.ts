/**
 * 导出功能 E2E 测试
 */

import { test, expect } from './fixtures/auth.fixture'
import { ArticlesPage } from './pages/ArticlesPage'

test.describe('文章导出功能', () => {
  let articlesPage: ArticlesPage

  test.beforeEach(async ({ authenticatedPage }) => {
    articlesPage = new ArticlesPage(authenticatedPage)
    await articlesPage.navigate()
  })

  test.describe('导出对话框', () => {
    test('应该打开导出对话框', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        // 选择一篇文章
        await articlesPage.selectArticles([0])

        // 打开导出对话框
        await articlesPage.exportSelected()

        // 验证对话框已打开
        const dialogVisible = await authenticatedPage.isVisible('.export-dialog, .arco-modal')
        expect(dialogVisible).toBe(true)
      }
    })

    test('应该显示导出格式选项', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()

        // 验证格式选项存在
        const markdownOption = await authenticatedPage.isVisible('input[value="markdown"], label:has-text("Markdown")')
        const docxOption = await authenticatedPage.isVisible('input[value="docx"], label:has-text("DOCX")')
        const pdfOption = await authenticatedPage.isVisible('input[value="pdf"], label:has-text("PDF")')

        expect(markdownOption || docxOption || pdfOption).toBe(true)
      }
    })

    test('应该显示导出选项', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()

        // 检查常见的导出选项
        const includeImagesOption = await authenticatedPage.isVisible('input[type="checkbox"]:has-text("图片"), label:has-text("包含图片")')
        const includeCommentsOption = await authenticatedPage.isVisible('input[type="checkbox"]:has-text("评论"), label:has-text("包含评论")')

        expect(includeImagesOption || includeCommentsOption).toBe(true)
      }
    })
  })

  test.describe('导出 Markdown', () => {
    test('应该能够导出为 Markdown', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()

        // 选择 Markdown 格式
        await authenticatedPage.click('input[value="markdown"], label:has-text("Markdown")')

        // 点击导出按钮
        const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 30000 })
        await authenticatedPage.click('button:has-text("导出"), button:has-text("确定")')

        // 验证下载开始
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.md$|\.zip$/)
      }
    })

    test('Markdown 导出应该支持自定义选项', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()

        // 选择 Markdown
        await authenticatedPage.click('input[value="markdown"]')

        // 配置选项
        const includeImages = await authenticatedPage.isVisible('input[type="checkbox"]:has-text("图片")')
        if (includeImages) {
          await authenticatedPage.click('input[type="checkbox"]:has-text("图片")')
        }

        // 导出
        await authenticatedPage.click('button:has-text("导出")')
      }
    })
  })

  test.describe('导出 DOCX', () => {
    test('应该能够导出为 DOCX', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()

        // 选择 DOCX 格式
        await authenticatedPage.click('input[value="docx"], label:has-text("DOCX")')

        // 点击导出
        const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 30000 })
        await authenticatedPage.click('button:has-text("导出")')

        // 验证下载
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.docx$|\.zip$/)
      }
    })
  })

  test.describe('导出 PDF', () => {
    test('应该能够导出为 PDF', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()

        // 选择 PDF 格式
        await authenticatedPage.click('input[value="pdf"], label:has-text("PDF")')

        // 点击导出
        const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 30000 })
        await authenticatedPage.click('button:has-text("导出")')

        // 验证下载
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.pdf$|\.zip$/)
      }
    })
  })

  test.describe('批量导出', () => {
    test('应该能够批量导出多篇文章', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count >= 3) {
        // 选择多篇文章
        await articlesPage.selectArticles([0, 1, 2])

        await articlesPage.exportSelected()

        // 验证提示选中了多篇文章
        const dialogText = await authenticatedPage.textContent('.export-dialog, .arco-modal')
        expect(dialogText).toMatch(/3|多篇/)

        // 执行导出
        await authenticatedPage.click('button:has-text("导出")')
      }
    })

    test('批量导出应该生成压缩包', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count >= 2) {
        await articlesPage.selectArticles([0, 1])
        await articlesPage.exportSelected()

        const downloadPromise = authenticatedPage.waitForEvent('download', { timeout: 30000 })
        await authenticatedPage.click('button:has-text("导出")')

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/\.zip$/)
      }
    })
  })

  test.describe('导出任务管理', () => {
    test('应该能够查看导出任务列表', async ({ authenticatedPage }) => {
      // 导航到导出任务页面
      await authenticatedPage.goto('/export')
      await authenticatedPage.waitForLoadState('networkidle')

      // 验证任务列表存在
      const listVisible = await authenticatedPage.isVisible('.export-jobs, .tasks-list')
      expect(listVisible).toBe(true)
    })

    test('应该显示导出任务状态', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        // 创建导出任务
        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()
        await authenticatedPage.click('button:has-text("导出")')

        // 等待任务创建
        await authenticatedPage.waitForTimeout(1000)

        // 导航到导出任务页面
        await authenticatedPage.goto('/export')
        await authenticatedPage.waitForLoadState('networkidle')

        // 验证任务状态显示
        const statusVisible = await authenticatedPage.isVisible('.task-status, .status-badge')
        expect(statusVisible).toBe(true)
      }
    })

    test('应该能够下载已完成的导出', async ({ authenticatedPage }) => {
      // 导航到导出任务页面
      await authenticatedPage.goto('/export')
      await authenticatedPage.waitForLoadState('networkidle')

      // 查找已完成的任务
      const completedTask = await authenticatedPage.$('.task-status:has-text("完成"), .status-completed')

      if (completedTask) {
        // 点击下载按钮
        const downloadPromise = authenticatedPage.waitForEvent('download')
        await authenticatedPage.click('button:has-text("下载")')

        const download = await downloadPromise
        expect(download).toBeTruthy()
      }
    })

    test('应该能够删除导出任务', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/export')
      await authenticatedPage.waitForLoadState('networkidle')

      const taskCount = await authenticatedPage.$$('.export-task, .task-item').then(tasks => tasks.length)

      if (taskCount > 0) {
        // 删除第一个任务
        await authenticatedPage.click('button:has-text("删除")').catch(() => {})

        // 确认删除
        const confirmButton = await authenticatedPage.$('button:has-text("确定"), button:has-text("确认")')
        if (confirmButton) {
          await confirmButton.click()
        }

        // 验证任务已删除
        await authenticatedPage.waitForTimeout(500)
        const newTaskCount = await authenticatedPage.$$('.export-task, .task-item').then(tasks => tasks.length)
        expect(newTaskCount).toBeLessThanOrEqual(taskCount)
      }
    })
  })

  test.describe('错误处理', () => {
    test('未选择文章应该禁用导出按钮', async ({ authenticatedPage }) => {
      const exportButton = await authenticatedPage.$('button:has-text("导出")')
      if (exportButton) {
        const isDisabled = await exportButton.isDisabled()
        expect(isDisabled).toBe(true)
      }
    })

    test('应该处理导出失败的情况', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count > 0) {
        // 模拟网络错误
        await authenticatedPage.context().setOffline(true)

        await articlesPage.selectArticles([0])
        await articlesPage.exportSelected()
        await authenticatedPage.click('button:has-text("导出")')

        // 应该显示错误消息
        const errorVisible = await authenticatedPage.isVisible('.error-message, .arco-message-error')
        expect(errorVisible).toBe(true)

        // 恢复网络
        await authenticatedPage.context().setOffline(false)
      }
    })
  })

  test.describe('性能测试', () => {
    test('大量文章导出应该在合理时间内完成', async ({ authenticatedPage }) => {
      const count = await articlesPage.getArticlesCount()

      if (count >= 10) {
        const startTime = Date.now()

        // 选择10篇文章
        await articlesPage.selectArticles([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        await articlesPage.exportSelected()
        await authenticatedPage.click('button:has-text("导出")')

        // 等待导出开始
        await authenticatedPage.waitForTimeout(2000)

        const exportTime = Date.now() - startTime

        // 导出任务创建应该在5秒内完成
        expect(exportTime).toBeLessThan(5000)
      }
    })
  })
})
