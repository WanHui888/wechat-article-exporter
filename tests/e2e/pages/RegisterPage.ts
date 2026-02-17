/**
 * 注册页面 - Page Object
 */

import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class RegisterPage extends BasePage {
  // 选择器
  private readonly usernameInput = 'input[name="username"]'
  private readonly passwordInput = 'input[name="password"]'
  private readonly confirmPasswordInput = 'input[name="confirmPassword"], input[name="password2"]'
  private readonly emailInput = 'input[name="email"], input[type="email"]'
  private readonly nicknameInput = 'input[name="nickname"]'
  private readonly registerButton = 'button[type="submit"], button:has-text("注册")'
  private readonly loginLink = 'a:has-text("登录"), a[href*="login"]'
  private readonly successMessage = '.success-message, .arco-message-success'
  private readonly errorMessage = '.error-message, .arco-form-item-message'

  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到注册页面
   */
  async navigate() {
    await this.goto('/register')
    await this.waitForLoad()
  }

  /**
   * 执行注册操作
   */
  async register(data: {
    username: string
    password: string
    confirmPassword?: string
    email?: string
    nickname?: string
  }) {
    await this.waitAndFill(this.usernameInput, data.username)
    await this.waitAndFill(this.passwordInput, data.password)

    if (data.confirmPassword !== undefined) {
      await this.fill(this.confirmPasswordInput, data.confirmPassword)
    }

    if (data.email) {
      await this.fill(this.emailInput, data.email)
    }

    if (data.nickname) {
      await this.fill(this.nicknameInput, data.nickname)
    }

    // 等待注册 API 响应
    await this.waitForApiResponse(/\/api\/auth\/register/, async () => {
      await this.click(this.registerButton)
    })
  }

  /**
   * 点击登录链接
   */
  async goToLogin() {
    await this.click(this.loginLink)
    await this.waitForNavigation('/login')
  }

  /**
   * 获取成功消息
   */
  async getSuccessMessage(): Promise<string> {
    await this.waitForElement(this.successMessage)
    return await this.getText(this.successMessage)
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string> {
    await this.waitForElement(this.errorMessage)
    return await this.getText(this.errorMessage)
  }

  /**
   * 检查用户名字段是否有错误
   */
  async hasUsernameError(): Promise<boolean> {
    const usernameError = `${this.usernameInput} + .error-message`
    return await this.isVisible(usernameError)
  }

  /**
   * 检查密码字段是否有错误
   */
  async hasPasswordError(): Promise<boolean> {
    const passwordError = `${this.passwordInput} + .error-message`
    return await this.isVisible(passwordError)
  }
}
