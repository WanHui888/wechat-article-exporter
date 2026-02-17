/**
 * 认证测试夹具
 */

import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { DashboardPage } from '../pages/DashboardPage'

/**
 * 测试用户数据
 */
export const testUsers = {
  admin: {
    username: 'admin',
    password: 'Admin123!',
    email: 'admin@example.com',
    nickname: 'Administrator',
  },
  user1: {
    username: 'testuser1',
    password: 'TestUser123!',
    email: 'user1@example.com',
    nickname: 'Test User 1',
  },
  user2: {
    username: 'testuser2',
    password: 'TestUser123!',
    email: 'user2@example.com',
    nickname: 'Test User 2',
  },
}

/**
 * 扩展的测试类型，包含页面对象和认证状态
 */
type AuthFixtures = {
  loginPage: LoginPage
  registerPage: RegisterPage
  dashboardPage: DashboardPage
  authenticatedPage: Page
}

/**
 * 扩展 Playwright test，添加认证相关的夹具
 */
export const test = base.extend<AuthFixtures>({
  /**
   * 登录页面夹具
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await use(loginPage)
  },

  /**
   * 注册页面夹具
   */
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page)
    await use(registerPage)
  },

  /**
   * 仪表盘页面夹具
   */
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page)
    await use(dashboardPage)
  },

  /**
   * 已认证的页面夹具（自动登录）
   */
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)

    // 自动登录
    await loginPage.navigate()
    await loginPage.login(testUsers.user1.username, testUsers.user1.password)

    // 等待导航完成
    await page.waitForURL(/\/(dashboard|home|\/)/, { timeout: 10000 })

    await use(page)

    // 清理：登出
    await page.evaluate(() => localStorage.clear())
  },
})

export { expect } from '@playwright/test'
