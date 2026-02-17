/**
 * 仪表盘页面 - Page Object
 */

import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class DashboardPage extends BasePage {
  // 选择器
  private readonly pageTitle = 'h1, .page-title'
  private readonly userAvatar = '.user-avatar, .avatar'
  private readonly userMenu = '.user-menu, .dropdown-menu'
  private readonly logoutButton = 'button:has-text("退出"), a:has-text("退出登录")'
  private readonly accountsCard = '.accounts-card, [data-testid="accounts-card"]'
  private readonly articlesCard = '.articles-card, [data-testid="articles-card"]'
  private readonly storageCard = '.storage-card, [data-testid="storage-card"]'
  private readonly navMenu = '.nav-menu, .sidebar'

  // 导航链接
  private readonly accountsLink = 'a[href*="/accounts"], a:has-text("账号管理")'
  private readonly articlesLink = 'a[href*="/articles"], a:has-text("文章管理")'
  private readonly exportLink = 'a[href*="/export"], a:has-text("导出")'
  private readonly settingsLink = 'a[href*="/settings"], a:has-text("设置")'

  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到仪表盘
   */
  async navigate() {
    await this.goto('/')
    await this.waitForLoad()
  }

  /**
   * 获取页面标题
   */
  async getTitle(): Promise<string> {
    return await this.getText(this.pageTitle)
  }

  /**
   * 打开用户菜单
   */
  async openUserMenu() {
    await this.click(this.userAvatar)
    await this.waitForElement(this.userMenu)
  }

  /**
   * 退出登录
   */
  async logout() {
    await this.openUserMenu()
    await this.click(this.logoutButton)
    await this.waitForNavigation('/login')
  }

  /**
   * 获取账号数量
   */
  async getAccountsCount(): Promise<number> {
    const text = await this.getText(this.accountsCard)
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  /**
   * 获取文章数量
   */
  async getArticlesCount(): Promise<number> {
    const text = await this.getText(this.articlesCard)
    const match = text.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{ used: string; total: string }> {
    const text = await this.getText(this.storageCard)
    // 假设格式为 "1.2GB / 5GB"
    const match = text.match(/([\d.]+\s*[KMGT]?B)\s*\/\s*([\d.]+\s*[KMGT]?B)/)
    return {
      used: match ? match[1] : '0',
      total: match ? match[2] : '0',
    }
  }

  /**
   * 导航到账号管理
   */
  async goToAccounts() {
    await this.click(this.accountsLink)
    await this.waitForNavigation('/accounts')
  }

  /**
   * 导航到文章管理
   */
  async goToArticles() {
    await this.click(this.articlesLink)
    await this.waitForNavigation('/articles')
  }

  /**
   * 导航到导出页面
   */
  async goToExport() {
    await this.click(this.exportLink)
    await this.waitForNavigation('/export')
  }

  /**
   * 导航到设置页面
   */
  async goToSettings() {
    await this.click(this.settingsLink)
    await this.waitForNavigation('/settings')
  }

  /**
   * 检查是否在仪表盘页面
   */
  async isDashboard(): Promise<boolean> {
    return this.getUrl().includes('/') && !this.getUrl().includes('/login')
  }
}
