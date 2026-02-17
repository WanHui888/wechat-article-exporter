/**
 * 基础页面类 - Page Object 模式
 */

import type { Page, Locator } from '@playwright/test'

export class BasePage {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * 导航到指定路径
   */
  async goto(path: string) {
    await this.page.goto(path)
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * 等待元素可见
   */
  async waitForElement(selector: string) {
    await this.page.waitForSelector(selector, { state: 'visible' })
  }

  /**
   * 点击元素
   */
  async click(selector: string) {
    await this.page.click(selector)
  }

  /**
   * 填写表单
   */
  async fill(selector: string, value: string) {
    await this.page.fill(selector, value)
  }

  /**
   * 获取文本内容
   */
  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || ''
  }

  /**
   * 检查元素是否可见
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector)
  }

  /**
   * 截图
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-reports/screenshots/${name}.png` })
  }

  /**
   * 等待并点击
   */
  async waitAndClick(selector: string) {
    await this.waitForElement(selector)
    await this.click(selector)
  }

  /**
   * 等待并填写
   */
  async waitAndFill(selector: string, value: string) {
    await this.waitForElement(selector)
    await this.fill(selector, value)
  }

  /**
   * 获取当前 URL
   */
  getUrl(): string {
    return this.page.url()
  }

  /**
   * 等待导航完成
   */
  async waitForNavigation(url?: string) {
    if (url) {
      await this.page.waitForURL(url)
    } else {
      await this.page.waitForLoadState('networkidle')
    }
  }

  /**
   * 检查 Toast 消息
   */
  async expectToast(message: string) {
    const toast = this.page.locator('.arco-message, .toast, .notification')
    await toast.waitFor({ state: 'visible' })
    const text = await toast.textContent()
    return text?.includes(message) || false
  }

  /**
   * 等待 API 请求
   */
  async waitForApiResponse(urlPattern: string | RegExp, callback: () => Promise<void>) {
    const responsePromise = this.page.waitForResponse(urlPattern)
    await callback()
    return await responsePromise
  }
}
