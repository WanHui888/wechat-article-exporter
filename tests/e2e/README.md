# E2E 测试套件

完整的端到端测试套件，使用 Playwright 测试框架覆盖应用的关键用户流程。

## 📁 目录结构

```
tests/e2e/
├── pages/              # Page Object 模式的页面类
│   ├── BasePage.ts     # 基础页面类
│   ├── LoginPage.ts    # 登录页面
│   ├── RegisterPage.ts # 注册页面
│   ├── DashboardPage.ts # 仪表盘页面
│   ├── AccountsPage.ts # 账号管理页面
│   └── ArticlesPage.ts # 文章管理页面
├── fixtures/           # 测试夹具
│   └── auth.fixture.ts # 认证相关夹具
├── auth.spec.ts        # 认证流程测试
├── accounts.spec.ts    # 账号管理测试
├── articles.spec.ts    # 文章管理测试
├── export.spec.ts      # 导出功能测试
└── README.md           # 本文档
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
npx playwright install
```

### 运行测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行单个测试文件
npx playwright test tests/e2e/auth.spec.ts

# UI 模式运行（推荐用于调试）
npx playwright test --ui

# 调试模式
npx playwright test --debug

# 只在 Chrome 浏览器运行
npx playwright test --project=chromium

# 生成测试报告
npx playwright show-report
```

## 📚 测试套件说明

### 1. 认证流程测试 (`auth.spec.ts`)

**测试用例：**
- ✅ 用户注册流程（成功/失败场景）
- ✅ 用户登录流程
- ✅ 用户���出
- ✅ 完整认证流程
- ✅ 认证状态持久化
- ✅ 错误处理

### 2. 账号管理测试 (`accounts.spec.ts`)

**测试用例：**
- ✅ 账号列表显示
- ✅ 添加新账号
- ✅ 搜索账号
- ✅ 同步账号文章
- ✅ 删除账号
- ✅ 批量导入账号
- ✅ 完整流程测试
- ✅ 性能测试

### 3. 文章管理测试 (`articles.spec.ts`)

**测试用例：**
- ✅ 文章列表和分页
- ✅ 搜索文章
- ✅ 筛选功能
- ✅ 收藏功能
- ✅ 查看详情
- ✅ 批量操作
- ✅ 响应式设计

### 4. 导出功能测试 (`export.spec.ts`)

**测试用例：**
- ✅ 导出 Markdown/DOCX/PDF
- ✅ 批量导出
- ✅ 任务管理
- ✅ 下载管理
- ✅ 错误处理

## 🎭 Page Object 模式

所有测试使用 Page Object 模式组织，提高代码复用性和可维护性。

```typescript
// 示例
const loginPage = new LoginPage(page)
await loginPage.navigate()
await loginPage.login('username', 'password')
const isLoggedIn = await loginPage.isLoggedIn()
```

## 🔧 测试夹具

```typescript
import { test, expect, testUsers } from './fixtures/auth.fixture'

// 使用已认证的页面
test('需要登录的测试', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard')
})
```

## 📊 测试报告

```bash
# 生成并打开 HTML 报告
npx playwright show-report
```

报告包含：
- ✅ 测试结果统计
- 📸 失败测试的截图
- 🎥 失败测试的视频
- 📜 详细的执行日志

## 🐛 调试技巧

### UI 模式（推荐）

```bash
npx playwright test --ui
```

### Debug 模式

```bash
npx playwright test --debug
```

### 慢动作模式

```bash
npx playwright test --slowmo=1000
```

## 📈 当前测试覆盖

- ✅ **认证流程**: 15个测试用例
- ✅ **账号管理**: 20个测试用例
- ✅ **文章管理**: 25个测试用例
- ✅ **导出功能**: 15个测试用例

**总计：75+ E2E 测试用例**

## 🎯 最佳实践

1. 使用描述性的测试名称
2. 使用 Page Object 模式
3. 等待元素而不是使用固定延迟
4. 独立的测试用例
5. 使用测试夹具
6. 处理异步操作

## 🆘 常见问题

### Q: 测试失败怎么办？

1. 查看失败截图
2. 使用 UI 模式重新运行
3. 查看详细日志

### Q: 如何加速测试？

1. 并行运行：`--workers=4`
2. 只运行必要的浏览器：`--project=chromium`

## 📞 支持

如有问题或建议，请提交 Issue 或联系开发团队。
