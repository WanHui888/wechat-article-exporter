/**
 * 认证流程 E2E 测试
 */

import { test, expect, testUsers } from './fixtures/auth.fixture'

test.describe('用户认证流程', () => {
  test.describe('用户注册', () => {
    test('应该成功注册新用户', async ({ page, registerPage }) => {
      await registerPage.navigate()

      // 生成唯一用户名
      const timestamp = Date.now()
      const userData = {
        username: `newuser${timestamp}`,
        password: 'NewUser123!',
        confirmPassword: 'NewUser123!',
        email: `newuser${timestamp}@example.com`,
        nickname: 'New User',
      }

      await registerPage.register(userData)

      // 验证注册成功
      await expect(page).toHaveURL(/\/(dashboard|home|\/)/, { timeout: 10000 })
    })

    test('应该拒绝用户名过短的注册', async ({ registerPage }) => {
      await registerPage.navigate()

      await registerPage.register({
        username: 'ab', // 太短
        password: 'Password123!',
        confirmPassword: 'Password123!',
      })

      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('用户名')
    })

    test('应该拒绝密码过短的注册', async ({ registerPage }) => {
      await registerPage.navigate()

      const timestamp = Date.now()
      await registerPage.register({
        username: `user${timestamp}`,
        password: '123', // 太短
        confirmPassword: '123',
      })

      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('密码')
    })

    test('应该拒绝密码不匹配的注册', async ({ registerPage }) => {
      await registerPage.navigate()

      const timestamp = Date.now()
      await registerPage.register({
        username: `user${timestamp}`,
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!', // 不匹配
      })

      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage.toLowerCase()).toMatch(/密码|不一致|匹配/)
    })

    test('应该拒绝重复的用户名', async ({ registerPage }) => {
      await registerPage.navigate()

      // 第一次注册
      const userData = {
        username: testUsers.user1.username,
        password: testUsers.user1.password,
        confirmPassword: testUsers.user1.password,
      }

      await registerPage.register(userData)

      // 等待一下，然后尝试再次注册相同用户名
      await registerPage.navigate()
      await registerPage.register(userData)

      const errorMessage = await registerPage.getErrorMessage()
      expect(errorMessage).toContain('已存在')
    })
  })

  test.describe('用户登录', () => {
    test.beforeEach(async ({ page }) => {
      // 确保清除任何现有的认证状态
      await page.evaluate(() => localStorage.clear())
    })

    test('应该成功登录', async ({ page, loginPage }) => {
      await loginPage.navigate()
      await loginPage.login(testUsers.user1.username, testUsers.user1.password)

      // 验证登录成功，跳转到仪表盘
      await expect(page).toHaveURL(/\/(dashboard|home|\/)/, { timeout: 10000 })

      // 验证 token 已保存
      const isLoggedIn = await loginPage.isLoggedIn()
      expect(isLoggedIn).toBe(true)
    })

    test('应该拒绝错误的用户名', async ({ loginPage }) => {
      await loginPage.navigate()
      await loginPage.login('wrongusername', testUsers.user1.password)

      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage.toLowerCase()).toMatch(/用户名|密码|错误/)
    })

    test('应该拒绝错误的密码', async ({ loginPage }) => {
      await loginPage.navigate()
      await loginPage.login(testUsers.user1.username, 'WrongPassword123!')

      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage.toLowerCase()).toMatch(/用户名|密码|错误/)
    })

    test('应该拒绝空用户名', async ({ loginPage }) => {
      await loginPage.navigate()
      await loginPage.login('', testUsers.user1.password)

      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage).toBeTruthy()
    })

    test('应该拒绝空密码', async ({ loginPage }) => {
      await loginPage.navigate()
      await loginPage.login(testUsers.user1.username, '')

      const errorMessage = await loginPage.getErrorMessage()
      expect(errorMessage).toBeTruthy()
    })
  })

  test.describe('用户登出', () => {
    test('应该成功登出', async ({ page, loginPage, dashboardPage }) => {
      // 先登录
      await loginPage.navigate()
      await loginPage.login(testUsers.user1.username, testUsers.user1.password)
      await expect(page).toHaveURL(/\/(dashboard|home|\/)/)

      // 登出
      await dashboardPage.logout()

      // 验证跳转到登录页面
      await expect(page).toHaveURL(/\/login/)

      // 验证 token 已清除
      const isLoggedIn = await loginPage.isLoggedIn()
      expect(isLoggedIn).toBe(false)
    })
  })

  test.describe('完整认证流程', () => {
    test('应该完成：注册 → 登录 → 查看仪表盘 → 登出', async ({
      page,
      registerPage,
      loginPage,
      dashboardPage,
    }) => {
      // 1. 注册
      const timestamp = Date.now()
      const userData = {
        username: `flowuser${timestamp}`,
        password: 'FlowUser123!',
        confirmPassword: 'FlowUser123!',
        email: `flowuser${timestamp}@example.com`,
        nickname: 'Flow User',
      }

      await registerPage.navigate()
      await registerPage.register(userData)
      await expect(page).toHaveURL(/\/(dashboard|home|\/)/)

      // 2. 登出
      await dashboardPage.logout()
      await expect(page).toHaveURL(/\/login/)

      // 3. 重新登录
      await loginPage.login(userData.username, userData.password)
      await expect(page).toHaveURL(/\/(dashboard|home|\/)/)

      // 4. 验证仪表盘内容
      const isDashboard = await dashboardPage.isDashboard()
      expect(isDashboard).toBe(true)

      // 5. 最后登出
      await dashboardPage.logout()
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('认证状态持久化', () => {
    test('应该在页面刷新后保持登录状态', async ({ page, loginPage, dashboardPage }) => {
      // 登录
      await loginPage.navigate()
      await loginPage.login(testUsers.user1.username, testUsers.user1.password)
      await expect(page).toHaveURL(/\/(dashboard|home|\/)/)

      // 刷新页面
      await page.reload()

      // 验证仍然登录
      const isDashboard = await dashboardPage.isDashboard()
      expect(isDashboard).toBe(true)

      const isLoggedIn = await loginPage.isLoggedIn()
      expect(isLoggedIn).toBe(true)
    })

    test('应该阻止未认证用户访问受保护页面', async ({ page }) => {
      // 清除认证状态
      await page.evaluate(() => localStorage.clear())

      // 尝试直接访问受保护页面
      await page.goto('/dashboard')

      // 应该被重定向到登录页面
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })
  })

  test.describe('错误处理', () => {
    test('应该显示网络错误提示', async ({ page, loginPage }) => {
      // 模拟网络离线
      await page.context().setOffline(true)

      await loginPage.navigate()
      await loginPage.login(testUsers.user1.username, testUsers.user1.password)

      // 应该显示网络错误
      const errorVisible = await page.isVisible('.error-message, .arco-message-error')
      expect(errorVisible).toBe(true)

      // 恢复网络
      await page.context().setOffline(false)
    })
  })
})
