/**
 * 账号管理 E2E 测试
 */

import { test, expect } from './fixtures/auth.fixture'
import { AccountsPage } from './pages/AccountsPage'

test.describe('账号管理功能', () => {
  let accountsPage: AccountsPage

  test.beforeEach(async ({ authenticatedPage }) => {
    accountsPage = new AccountsPage(authenticatedPage)
    await accountsPage.navigate()
  })

  test.describe('账号列表', () => {
    test('应该显示账号列表', async () => {
      const count = await accountsPage.getAccountsCount()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('应该能够获取账号详细信息', async () => {
      const accounts = await accountsPage.getAccountsList()

      if (accounts.length > 0) {
        const firstAccount = accounts[0]
        expect(firstAccount).toHaveProperty('nickname')
        expect(firstAccount).toHaveProperty('fakeid')
        expect(firstAccount.nickname).toBeTruthy()
      }
    })
  })

  test.describe('添加账号', () => {
    test('应该成功添加新账号', async () => {
      const timestamp = Date.now()
      const accountData = {
        nickname: `测试公众号${timestamp}`,
        fakeid: `fakeid_${timestamp}`,
      }

      const initialCount = await accountsPage.getAccountsCount()

      await accountsPage.addAccount(accountData.nickname, accountData.fakeid)

      // 验证账号已添加
      const hasAccount = await accountsPage.hasAccount(accountData.nickname)
      expect(hasAccount).toBe(true)

      const newCount = await accountsPage.getAccountsCount()
      expect(newCount).toBe(initialCount + 1)
    })

    test('应该拒绝空的公众号名称', async ({ authenticatedPage }) => {
      await accountsPage.clickAddAccount()

      // 尝试提交空表单
      await authenticatedPage.click('button:has-text("确定")')

      // 应该显示验证错误
      const errorVisible = await authenticatedPage.isVisible('.error-message, .arco-form-item-message-error')
      expect(errorVisible).toBe(true)
    })

    test('应该拒绝重复的 fakeid', async () => {
      const timestamp = Date.now()
      const accountData = {
        nickname: `公众号A_${timestamp}`,
        fakeid: `duplicate_${timestamp}`,
      }

      // 第一次添加
      await accountsPage.addAccount(accountData.nickname, accountData.fakeid)

      // 尝试添加相同 fakeid
      await accountsPage.addAccount(`公众号B_${timestamp}`, accountData.fakeid)

      // 应该显示错误提示
      const errorMessage = await accountsPage.page.textContent('.error-message, .arco-message-error')
      expect(errorMessage).toMatch(/已存在|重复/)
    })
  })

  test.describe('搜索账号', () => {
    test('应该能够按名称搜索账号', async () => {
      // 先添加一个测试账号
      const timestamp = Date.now()
      const accountName = `搜索测试${timestamp}`
      await accountsPage.addAccount(accountName, `fakeid_${timestamp}`)

      // 搜索
      await accountsPage.searchAccount(accountName)

      // 验证搜索结果
      const hasAccount = await accountsPage.hasAccount(accountName)
      expect(hasAccount).toBe(true)
    })

    test('搜索不存在的账号应该返回空结果', async () => {
      await accountsPage.searchAccount('不存在的公众号12345xyz')

      const count = await accountsPage.getAccountsCount()
      expect(count).toBe(0)
    })
  })

  test.describe('同步账号', () => {
    test('应该能够同步账号文章', async () => {
      // 确保至少有一个账号
      const initialCount = await accountsPage.getAccountsCount()

      if (initialCount === 0) {
        const timestamp = Date.now()
        await accountsPage.addAccount(`测试账号${timestamp}`, `fakeid_${timestamp}`)
      }

      // 同步第一个账号
      await accountsPage.syncAccount(0)

      // 验证同步对话框已关闭或显示成功消息
      const successVisible = await accountsPage.page.isVisible('.success-message, .arco-message-success', {
        timeout: 30000, // 同步可能需要一些时间
      })
      expect(successVisible).toBe(true)
    })
  })

  test.describe('删除账号', () => {
    test('应该能够删除账号', async () => {
      // 先添加一个账号
      const timestamp = Date.now()
      const accountName = `待删除${timestamp}`
      await accountsPage.addAccount(accountName, `fakeid_${timestamp}`)

      const initialCount = await accountsPage.getAccountsCount()

      // 删除最后一个账号（刚添加的）
      await accountsPage.deleteAccount(initialCount - 1)

      // 验证账号已删除
      const hasAccount = await accountsPage.hasAccount(accountName)
      expect(hasAccount).toBe(false)

      const newCount = await accountsPage.getAccountsCount()
      expect(newCount).toBe(initialCount - 1)
    })

    test('删除账号应该显示确认对话框', async ({ authenticatedPage }) => {
      // 确保至少有一个账号
      const count = await accountsPage.getAccountsCount()
      if (count === 0) {
        const timestamp = Date.now()
        await accountsPage.addAccount(`测试${timestamp}`, `fakeid_${timestamp}`)
      }

      // 点击删除按钮
      await authenticatedPage.click('button:has-text("删除")').catch(() => {})

      // 应该显示确认对话框
      const dialogVisible = await authenticatedPage.isVisible('.arco-modal, .dialog')
      expect(dialogVisible).toBe(true)

      // 取消删除
      await authenticatedPage.click('button:has-text("取消")')
    })
  })

  test.describe('批量导入账号', () => {
    test('应该能够批量导入账号', async () => {
      const timestamp = Date.now()
      const importData = JSON.stringify({
        accounts: [
          {
            nickname: `导入账号1_${timestamp}`,
            fakeid: `import1_${timestamp}`,
            alias: 'import-account-1',
          },
          {
            nickname: `导入账号2_${timestamp}`,
            fakeid: `import2_${timestamp}`,
            alias: 'import-account-2',
          },
        ],
      })

      const initialCount = await accountsPage.getAccountsCount()

      await accountsPage.importAccounts(importData)

      const newCount = await accountsPage.getAccountsCount()
      expect(newCount).toBe(initialCount + 2)

      // 验证账号已导入
      const hasAccount1 = await accountsPage.hasAccount(`导入账号1_${timestamp}`)
      const hasAccount2 = await accountsPage.hasAccount(`导入账号2_${timestamp}`)
      expect(hasAccount1).toBe(true)
      expect(hasAccount2).toBe(true)
    })

    test('应该拒绝无效的 JSON 格式', async ({ authenticatedPage }) => {
      await authenticatedPage.click('button:has-text("导入")')
      await accountsPage.page.waitForSelector('.arco-modal, .dialog')

      // 输入无效 JSON
      await authenticatedPage.fill('textarea', 'invalid json')
      await authenticatedPage.click('button:has-text("确定")')

      // 应该显示错误
      const errorVisible = await authenticatedPage.isVisible('.error-message, .arco-message-error')
      expect(errorVisible).toBe(true)
    })
  })

  test.describe('账号管理完整流程', () => {
    test('应该完成：添加 → 搜索 → 同步 → 删除', async () => {
      const timestamp = Date.now()
      const accountName = `流程测试${timestamp}`
      const fakeid = `flow_${timestamp}`

      // 1. 添加账号
      await accountsPage.addAccount(accountName, fakeid)
      let hasAccount = await accountsPage.hasAccount(accountName)
      expect(hasAccount).toBe(true)

      // 2. 搜索账号
      await accountsPage.searchAccount(accountName)
      hasAccount = await accountsPage.hasAccount(accountName)
      expect(hasAccount).toBe(true)

      // 3. 同步账号
      await accountsPage.syncAccount(0)

      // 4. 删除账号
      await accountsPage.navigate() // 重新加载列表
      await accountsPage.searchAccount(accountName)
      const count = await accountsPage.getAccountsCount()
      if (count > 0) {
        await accountsPage.deleteAccount(0)
      }

      // 验证账号已删除
      await accountsPage.navigate()
      hasAccount = await accountsPage.hasAccount(accountName)
      expect(hasAccount).toBe(false)
    })
  })

  test.describe('错误处理', () => {
    test('应该处理网络错误', async ({ authenticatedPage }) => {
      // 模拟网络离线
      await authenticatedPage.context().setOffline(true)

      const timestamp = Date.now()
      await accountsPage.addAccount(`测试${timestamp}`, `fakeid_${timestamp}`)

      // 应该显示错误消息
      const errorVisible = await authenticatedPage.isVisible('.error-message, .arco-message-error')
      expect(errorVisible).toBe(true)

      // 恢复网络
      await authenticatedPage.context().setOffline(false)
    })
  })

  test.describe('性能测试', () => {
    test('大量账号列表应该快速加载', async ({ authenticatedPage }) => {
      const startTime = Date.now()
      await accountsPage.navigate()
      await accountsPage.page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // 页面应该在 3 秒内加载完成
      expect(loadTime).toBeLessThan(3000)
    })
  })
})
