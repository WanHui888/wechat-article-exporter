# 测试文档

## 📋 目录结构

```
tests/
├── unit/               # 单元测试（函数、服务层）
├── integration/        # 集成测试（API 端点）
├── e2e/               # 端到端测试（用户流程）
├── fixtures/          # 测试数据夹具
│   ├── users.json     # 测试用户数据
│   ├── accounts.json  # 测试公众号数据
│   └── articles.json  # 测试文章数据
├── setup.ts           # 全局测试设置
└── README.md          # 本文件
```

---

## 🚀 运行测试

### 单元测试
```bash
npm run test:unit
```

### 集成测试
```bash
npm run test:integration
```

### E2E 测试
```bash
npm run test:e2e
```

### 所有测试
```bash
npm run test
```

### 测试覆盖率
```bash
npm run test -- --coverage
```

---

## 🔧 环境配置

测试使用 `.env.test` 配置文件：

| 变量 | 说明 |
|------|------|
| `DB_NAME=wechat_exporter_test` | 测试数据库（独立于生产） |
| `JWT_SECRET` | 测试用 JWT 密钥 |
| `SKIP_WECHAT_API=true` | 跳过微信 API，使用 Mock |

---

## 📊 测试覆盖率目标

| 类型 | 目标 |
|------|------|
| 行覆盖率 | 80% |
| 函数覆盖率 | 80% |
| 分支覆盖率 | 80% |
| 语句覆盖率 | 80% |

---

## 📝 测试数据说明

### 测试用户（fixtures/users.json）

| 用户名 | 密码 | 角色 | 状态 |
|--------|------|------|------|
| testadmin | TestAdmin123! | admin | 激活 |
| testuser | Test123! | user | 激活 |
| inactiveuser | Test123! | user | 禁用 |

**注意**：所有测试用户的密码哈希对应明文 `Test123!`

### 测试公众号（fixtures/accounts.json）

- **测试公众号A**（fakeid: `MzAwNjYwNTgxMA==`）
- **测试公众号B**（fakeid: `MzAwNjYwNTgxMQ==`）

### 测试文章（fixtures/articles.json）

- 共 3 篇测试文章
- 其中 1 篇带专辑标签

---

## 🧪 编写测试指南

### 单元测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '~/server/utils/myFunction'

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### 集成测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { eventHandler } from 'h3'

describe('POST /api/auth/login', () => {
  it('should login successfully', async () => {
    // 测试实现
  })
})
```

### E2E 测试示例

```typescript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/')
  await page.fill('input[name="username"]', 'testuser')
  await page.fill('input[name="password"]', 'Test123!')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

---

## 📌 注意事项

1. **数据库隔离**：测试使用独立的 `wechat_exporter_test` 数据库
2. **微信 API Mock**：测试中不会调用真实微信接口
3. **数据清理**：每个测试前自动清理数据库
4. **并发测试**：集成测试可能需要串行执行（避免数据库冲突）

---

## 🐛 调试测试

```bash
# 调试单个测试文件
npm run test -- tests/unit/auth.test.ts

# 使用 UI 模式调试
npx vitest --ui

# 调试 Playwright 测试
npx playwright test --debug
```

---

## 📈 生成测试报告

测试报告保存在 `test-reports/` 目录：

```
test-reports/
├── coverage/              # 覆盖率报告（HTML）
├── playwright-report/     # Playwright 报告
├── playwright-results.json
└── logs/                  # 测试日志
```
