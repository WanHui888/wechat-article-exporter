/**
 * 账号管理页面 - Page Object
 */

import type { Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class AccountsPage extends BasePage {
  // 选择器
  private readonly pageTitle = 'h1:has-text("账号管理")'
  private readonly addAccountButton = 'button:has-text("添加账号"), button:has-text("新增")'
  private readonly accountsList = '.accounts-list, .table'
  private readonly accountItem = '.account-item, tbody tr'
  private readonly searchInput = 'input[placeholder*="搜索"]'
  private readonly syncButton = 'button:has-text("同步")'
  private readonly deleteButton = 'button:has-text("删除")'

  // 对话框
  private readonly dialog = '.arco-modal, .dialog'
  private readonly dialogTitle = '.arco-modal-title, .dialog-title'
  private readonly dialogConfirm = 'button:has-text("确定"), button:has-text("确认")'
  private readonly dialogCancel = 'button:has-text("取消")'

  // 表单
  private readonly nicknameInput = 'input[name="nickname"]'
  private readonly fakeidInput = 'input[name="fakeid"]'

  constructor(page: Page) {
    super(page)
  }

  /**
   * 导航到账号管理页面
   */
  async navigate() {
    await this.goto('/accounts')
    await this.waitForLoad()
  }

  /**
   * 获取账号列表
   */
  async getAccountsList() {
    const items = await this.page.$$(this.accountItem)
    const accounts = []

    for (const item of items) {
      const nickname = await item.$eval('.nickname, td:nth-child(1)', el => el.textContent)
      const fakeid = await item.$eval('.fakeid, td:nth-child(2)', el => el.textContent)
      accounts.push({ nickname, fakeid })
    }

    return accounts
  }

  /**
   * 获取账号数量
   */
  async getAccountsCount(): Promise<number> {
    const items = await this.page.$$(this.accountItem)
    return items.length
  }

  /**
   * 点击添加账号按钮
   */
  async clickAddAccount() {
    await this.click(this.addAccountButton)
    await this.waitForElement(this.dialog)
  }

  /**
   * 添加新账号
   */
  async addAccount(nickname: string, fakeid: string) {
    await this.clickAddAccount()

    await this.fill(this.nicknameInput, nickname)
    await this.fill(this.fakeidInput, fakeid)

    await this.waitForApiResponse(/\/api\/data\/accounts/, async () => {
      await this.click(this.dialogConfirm)
    })

    await this.waitForLoad()
  }

  /**
   * 搜索账号
   */
  async searchAccount(keyword: string) {
    await this.fill(this.searchInput, keyword)
    await this.page.keyboard.press('Enter')
    await this.waitForLoad()
  }

  /**
   * 同步指定账号
   */
  async syncAccount(index: number) {
    const items = await this.page.$$(this.accountItem)
    const item = items[index]

    await item.$(this.syncButton).then(btn => btn?.click())
    await this.waitForElement(this.dialog)
    await this.click(this.dialogConfirm)

    // 等待同步完成
    await this.page.waitForTimeout(1000)
  }

  /**
   * 删除指定账号
   */
  async deleteAccount(index: number) {
    const items = await this.page.$$(this.accountItem)
    const item = items[index]

    await item.$(this.deleteButton).then(btn => btn?.click())
    await this.waitForElement(this.dialog)

    await this.waitForApiResponse(/\/api\/data\/accounts/, async () => {
      await this.click(this.dialogConfirm)
    })

    await this.waitForLoad()
  }

  /**
   * 检查账号是否存在
   */
  async hasAccount(nickname: string): Promise<boolean> {
    const accounts = await this.getAccountsList()
    return accounts.some(acc => acc.nickname === nickname)
  }

  /**
   * 批量导入账号
   */
  async importAccounts(jsonData: string) {
    // 点击导入按钮
    await this.click('button:has-text("导入")')
    await this.waitForElement(this.dialog)

    // 填写 JSON 数据
    await this.fill('textarea', jsonData)

    await this.waitForApiResponse(/\/api\/data\/accounts-import/, async () => {
      await this.click(this.dialogConfirm)
    })

    await this.waitForLoad()
  }
}
