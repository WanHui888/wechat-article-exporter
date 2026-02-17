/**
 * 登录页面 - Page Object
 */

import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  // 选择器
  private readonly usernameInput = 'input[name="username"], input[type="text"]'
  private readonly passwordInput = 'input[name="password"], input[type="password"]'
  private readonly loginButton = 'button[type="submit"], button:has-text("登录")'
  private readonly registerLink = 'a:has-text("注册"), a[href*="register"]'
  private readonly errorMessage = '.error-message, .arco-form-item-message'

  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到登录页面
   */
  async navigate() {
    await this.goto('/login')
    await this.waitForLoad()
  }

  /**
   * 执行登录操作
   */
  async login(username: string, password: string) {
    await this.waitAndFill(this.usernameInput, username)
    await this.waitAndFill(this.passwordInput, password)

    // 等待登录 API 响应
    await this.waitForApiResponse(/\/api\/auth\/login/, async () => {
      await this.click(this.loginButton)
    })
  }

  /**
   * 快速登录（用于测试前置条件）
   */
  async quickLogin(username: string, password: string) {
    await this.navigate()
    await this.login(username, password)
    await this.waitForNavigation()
  }

  /**
   * 点击注册链接
   */
  async goToRegister() {
    await this.click(this.registerLink)
    await this.waitForNavigation('/register')
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string> {
    await this.waitForElement(this.errorMessage)
    return await this.getText(this.errorMessage)
  }

  /**
   * 检查是否已登录（检查 token）
   */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.page.evaluate(() => localStorage.getItem('token'))
    return !!token
  }

  /**
   * 登出
   */
  async logout() {
    await this.page.evaluate(() => localStorage.removeItem('token'))
  }
}
