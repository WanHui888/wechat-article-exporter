/**
 * 文章管理页面 - Page Object
 */

import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class ArticlesPage extends BasePage {
  // 选择器
  private readonly pageTitle = 'h1:has-text("文章管理")'
  private readonly articlesList = '.articles-list, .table'
  private readonly articleItem = '.article-item, tbody tr'
  private readonly searchInput = 'input[placeholder*="搜索"]'
  private readonly filterButton = 'button:has-text("筛选")'
  private readonly exportButton = 'button:has-text("导出")'
  private readonly refreshButton = 'button:has-text("刷新")'

  // 筛选器
  private readonly accountFilter = 'select[name="account"], .account-filter'
  private readonly dateRangeFilter = '.date-range-picker'
  private readonly favoriteFilter = 'input[type="checkbox"]:has-text("收藏")'

  // 文章操作
  private readonly favoriteIcon = '.favorite-icon, .star-icon'
  private readonly viewButton = 'button:has-text("查看")'
  private readonly downloadButton = 'button:has-text("下载")'

  // 分页
  private readonly pagination = '.arco-pagination, .pagination'
  private readonly nextPageButton = 'button:has-text("下一页"), .arco-pagination-item-next'
  private readonly prevPageButton = 'button:has-text("上一页"), .arco-pagination-item-previous'

  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到文章管理页面
   */
  async navigate() {
    await this.goto('/articles')
    await this.waitForLoad()
  }

  /**
   * 获取文章列表
   */
  async getArticlesList() {
    const items = await this.page.$$(this.articleItem)
    const articles = []

    for (const item of items) {
      const title = await item.$eval('.title, td:nth-child(1)', el => el.textContent?.trim() || '')
      const account = await item.$eval('.account, td:nth-child(2)', el => el.textContent?.trim() || '')
      const date = await item.$eval('.date, td:nth-child(3)', el => el.textContent?.trim() || '')

      articles.push({ title, account, date })
    }

    return articles
  }

  /**
   * 获取文章数量
   */
  async getArticlesCount(): Promise<number> {
    const items = await this.page.$$(this.articleItem)
    return items.length
  }

  /**
   * 搜索文章
   */
  async searchArticle(keyword: string) {
    await this.fill(this.searchInput, keyword)
    await this.page.keyboard.press('Enter')
    await this.waitForLoad()
  }

  /**
   * 按账号筛选
   */
  async filterByAccount(accountName: string) {
    await this.click(this.filterButton)
    await this.page.selectOption(this.accountFilter, { label: accountName })
    await this.waitForLoad()
  }

  /**
   * 按日期范围筛选
   */
  async filterByDateRange(startDate: string, endDate: string) {
    await this.click(this.filterButton)
    await this.click(this.dateRangeFilter)

    // 选择开始日期
    await this.page.fill('.date-start', startDate)
    // 选择结束日期
    await this.page.fill('.date-end', endDate)

    await this.waitForLoad()
  }

  /**
   * 只显示收藏的文章
   */
  async filterFavorites() {
    await this.click(this.favoriteFilter)
    await this.waitForLoad()
  }

  /**
   * 收藏/取消收藏文章
   */
  async toggleFavorite(index: number) {
    const items = await this.page.$$(this.articleItem)
    const item = items[index]

    await item.$(this.favoriteIcon).then(icon => icon?.click())

    // 等待 API 响应
    await this.page.waitForTimeout(500)
  }

  /**
   * 查看文章详情
   */
  async viewArticle(index: number) {
    const items = await this.page.$$(this.articleItem)
    const item = items[index]

    await item.$(this.viewButton).then(btn => btn?.click())
    await this.waitForNavigation()
  }

  /**
   * 下载文章
   */
  async downloadArticle(index: number) {
    const items = await this.page.$$(this.articleItem)
    const item = items[index]

    const downloadPromise = this.page.waitForEvent('download')
    await item.$(this.downloadButton).then(btn => btn?.click())
    const download = await downloadPromise

    return download
  }

  /**
   * 批量选择文章
   */
  async selectArticles(indices: number[]) {
    for (const index of indices) {
      const items = await this.page.$$(this.articleItem)
      const item = items[index]
      await item.$('input[type="checkbox"]').then(cb => cb?.click())
    }
  }

  /**
   * 批量导出选中的文章
   */
  async exportSelected() {
    await this.click(this.exportButton)
    await this.waitForElement('.export-dialog, .arco-modal')
  }

  /**
   * 翻页
   */
  async nextPage() {
    await this.click(this.nextPageButton)
    await this.waitForLoad()
  }

  /**
   * 上一页
   */
  async prevPage() {
    await this.click(this.prevPageButton)
    await this.waitForLoad()
  }

  /**
   * 刷新列表
   */
  async refresh() {
    await this.click(this.refreshButton)
    await this.waitForLoad()
  }

  /**
   * 检查文章是否存在
   */
  async hasArticle(title: string): Promise<boolean> {
    const articles = await this.getArticlesList()
    return articles.some(article => article.title.includes(title))
  }
}
