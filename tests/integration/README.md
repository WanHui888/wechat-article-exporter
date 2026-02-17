# API 集成测试框架

完整的 API 集成测试框架，用于测试 Nuxt 3 应用的 API 端点。

## 目录结构

```
tests/
├── integration/           # 集成测试
│   ├── auth.test.ts      # 认证 API 测试
│   ├── accounts.test.ts  # 账号管理 API 测试
│   ├── articles.test.ts  # 文章管理 API 测试
│   └── admin.test.ts     # 管理员 API 测试
├── helpers/              # 测试助手
│   ├── api-client.ts    # API 测试客户端
│   ├── database.ts      # 测试数据库
│   ├── fixtures.ts      # 测试夹具加载器
│   └── assertions.ts    # 自定义断言
├── fixtures/            # 测试数据
│   ├── users.json
│   ├── accounts.json
│   └── articles.json
└── setup.ts            # 全局测试设置
```

## 快速开始

### 1. 基础测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createApiClient } from '../helpers/api-client'
import { assert } from '../helpers/assertions'

describe('Auth API', () => {
  const client = createApiClient()

  it('should register a new user', async () => {
    const response = await client.post('/api/auth/register', {
      username: 'testuser',
      password: 'Password123!',
      email: 'test@example.com'
    })

    // 使用自定义断言
    assert.api.isSuccess(response)
    assert.api.hasToken(response)
    assert.api.hasUser(response)
  })
})
```

### 2. 使用测试数据库

```typescript
import { testDb, seedTestDatabase, cleanTestDatabase } from '../helpers/database'

describe('Articles API', () => {
  beforeEach(async () => {
    cleanTestDatabase()
    await seedTestDatabase()
  })

  it('should get user articles', async () => {
    const user = testDb.getAllUsers()[0]
    const articles = testDb.getArticlesByUserId(user.id)

    expect(articles.length).toBeGreaterThan(0)
  })
})
```

### 3. 使用测试夹具

```typescript
import { Fixtures, TestDataBuilder, RandomDataGenerator } from '../helpers/fixtures'

describe('Data Tests', () => {
  it('should load fixture data', () => {
    const users = Fixtures.users()
    expect(users).toBeDefined()
  })

  it('should build test data', () => {
    const user = TestDataBuilder.user({
      username: 'custom-user'
    })
    expect(user.username).toBe('custom-user')
  })

  it('should generate random data', () => {
    const email = RandomDataGenerator.email()
    const username = RandomDataGenerator.username()

    expect(email).toMatch(/@example\.com$/)
    expect(username).toMatch(/^user_/)
  })
})
```

### 4. 认证流程测试

```typescript
describe('Authenticated Requests', () => {
  let token: string

  beforeEach(async () => {
    // 注册并获取 token
    const response = await client.post('/api/auth/register', {
      username: 'testuser',
      password: 'Password123!'
    })
    token = response.data.token
  })

  it('should access protected route', async () => {
    // 设置认证
    client.setAuth(token)

    const response = await client.get('/api/auth/me')

    assert.api.isOk(response)
    assert.api.hasUser(response)
  })

  it('should reject unauthorized request', async () => {
    // 清除认证
    client.clearAuth()

    const response = await client.get('/api/auth/me')

    assert.api.isUnauthorized(response)
  })
})
```

## API 客户端

### 基础用法

```typescript
import { createApiClient } from '../helpers/api-client'

const client = createApiClient()

// GET 请求
await client.get('/api/users')
await client.get('/api/users', { query: { page: 1, limit: 20 } })

// POST 请求
await client.post('/api/users', { username: 'test', password: '123456' })

// PUT 请求
await client.put('/api/users/1', { nickname: 'New Name' })

// DELETE 请求
await client.delete('/api/users/1')

// 带认证的请求
client.setAuth('your-token-here')
await client.get('/api/auth/me')

// 自定义 headers
await client.get('/api/users', {
  headers: { 'X-Custom-Header': 'value' }
})
```

### 响应格式

```typescript
interface ApiResponse<T> {
  status: number           // HTTP 状态码
  statusText: string       // 状态文本
  data?: T                 // 响应数据（成功时）
  error?: {                // 错误信息（失败时）
    statusCode: number
    statusMessage: string
  }
  headers: Record<string, string>  // 响应头
}
```

## 自定义断言

### API 响应断言

```typescript
import { assert } from '../helpers/assertions'

// 状态码断言
assert.api.isSuccess(response)      // 2xx
assert.api.isError(response)        // 4xx/5xx
assert.api.isOk(response)           // 200
assert.api.isCreated(response)      // 201
assert.api.isBadRequest(response)   // 400
assert.api.isUnauthorized(response) // 401
assert.api.isForbidden(response)    // 403
assert.api.isNotFound(response)     // 404
assert.api.isConflict(response)     // 409
assert.api.isServerError(response)  // 5xx

// 数据断言
assert.api.hasData(response)
assert.api.hasFields(response, ['id', 'name', 'email'])
assert.api.isArray(response)
assert.api.hasLength(response, 10)
assert.api.hasMinLength(response, 5)

// 特定数据断言
assert.api.hasToken(response)
assert.api.hasUser(response)
assert.api.hasPagination(response)

// Header 断��
assert.api.hasHeader(response, 'content-type')
assert.api.isJson(response)

// 错误断言
assert.api.hasErrorMessage(response, '用户名已存在')
```

### 数据验证断言

```typescript
import { assert } from '../helpers/assertions'

// 字段验证
assert.data.hasRequiredFields(user, ['id', 'username', 'email'])

// 对象验证
assert.data.isValidUser(user)
assert.data.isValidAccount(account)
assert.data.isValidArticle(article)

// 格式验证
assert.data.isValidTimestamp(timestamp)
assert.data.isValidDateString(dateStr)
assert.data.isValidUrl(url)
assert.data.isValidEmail(email)
```

### 性能断言

```typescript
import { assert } from '../helpers/assertions'

// 响应时间断言
await assert.perf.respondsWithin(async () => {
  await client.get('/api/users')
}, 100) // 最多 100ms

// 平均响应时间
await assert.perf.averageResponseTime(
  async () => await client.get('/api/users'),
  10,   // 执行 10 次
  50    // 平均最多 50ms
)
```

## 测试数据库

### 用户操作

```typescript
import { testDb } from '../helpers/database'

// 创建用户
const user = testDb.createUser({
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin'
})

// 获取用户
const user = testDb.getUser(1)
const user = testDb.getUserByUsername('testuser')
const users = testDb.getAllUsers()

// 更新用户
testDb.updateUser(1, { nickname: 'New Name' })

// 删除用户
testDb.deleteUser(1)
```

### 账号操作

```typescript
// 创建账号
const account = testDb.createAccount({
  userId: 1,
  nickname: '测试公众号',
  fakeid: 'fakeid-123'
})

// 获取账号
const account = testDb.getAccount(1)
const accounts = testDb.getAccountsByUserId(1)

// 删除账号
testDb.deleteAccount(1)
```

### 文章操作

```typescript
// 创建文章
const article = testDb.createArticle({
  userId: 1,
  accountId: 1,
  title: '测试文章'
})

// 获取文章
const article = testDb.getArticle(1)
const articles = testDb.getArticlesByUserId(1)
const articles = testDb.getArticlesByAccountId(1)
```

### 数据库管理

```typescript
// 重置数据库
testDb.reset()

// 获取统计信息
const stats = testDb.getStats()
// { users: 5, accounts: 10, articles: 50, ... }

// 种子数据
import { seedTestDatabase, cleanTestDatabase } from '../helpers/database'

// 填充种子数据
const { adminUser, normalUser, account1, account2 } = await seedTestDatabase()

// 清理数据
cleanTestDatabase()
```

## 测试夹具

### 加载夹具文件

```typescript
import { loadFixture, loadTextFixture, Fixtures } from '../helpers/fixtures'

// 加载 JSON 夹具
const users = loadFixture('users.json')
const accounts = loadFixture('accounts.json')

// 加载文本夹具
const html = loadTextFixture('sample-article.html')

// 使用预定义夹具
const users = Fixtures.users()
const accounts = Fixtures.accounts()
const articles = Fixtures.articles()
const html = Fixtures.sampleArticleHtml()
```

### 构建测试数据

```typescript
import { TestDataBuilder } from '../helpers/fixtures'

// 单个对象
const user = TestDataBuilder.user()
const user = TestDataBuilder.user({ username: 'custom' })

const account = TestDataBuilder.account()
const article = TestDataBuilder.article()

// 批量创建
const users = TestDataBuilder.batch(
  () => TestDataBuilder.user(),
  10  // 创建 10 个用户
)
```

### 随机数据生成

```typescript
import { RandomDataGenerator } from '../helpers/fixtures'

const str = RandomDataGenerator.string(10)      // 10 字符随机字符串
const num = RandomDataGenerator.number(1, 100)  // 1-100 随机数
const email = RandomDataGenerator.email()       // 随机邮箱
const username = RandomDataGenerator.username() // 随机用户名
const url = RandomDataGenerator.url()           // 随机 URL
const timestamp = RandomDataGenerator.timestamp() // 随机时间戳
const bool = RandomDataGenerator.boolean()      // 随机布尔值

// 从数组中随机选择
const role = RandomDataGenerator.pick(['admin', 'user'])
```

## 运行测试

```bash
# 运行所有集成测试
npm run test:integration

# 运行单个测试文件
npm test tests/integration/auth.test.ts

# 监视模式
npm test -- --watch tests/integration

# 生成覆盖率报告
npm run test:coverage -- tests/integration
```

## 最佳实践

### 1. 测试隔离

每个测试应该独立运行，不依赖其他测试的状态。

```typescript
describe('Users API', () => {
  beforeEach(() => {
    // 每个测试前重置数据库
    cleanTestDatabase()
  })

  it('test 1', () => { /* ... */ })
  it('test 2', () => { /* ... */ })
})
```

### 2. 使用描述性的测试名称

```typescript
// ❌ 不好
it('should work', () => { /* ... */ })

// ✅ 好
it('should return 401 when token is missing', () => { /* ... */ })
it('should create user with valid data', () => { /* ... */ })
```

### 3. AAA 模式（Arrange-Act-Assert）

```typescript
it('should update user profile', async () => {
  // Arrange - 准备
  const user = testDb.createUser({ username: 'test' })
  client.setAuth(user.token)

  // Act - 执行
  const response = await client.put('/api/auth/profile', {
    nickname: 'New Name'
  })

  // Assert - 断言
  assert.api.isOk(response)
  expect(response.data.user.nickname).toBe('New Name')
})
```

### 4. 测试边界情况

```typescript
describe('User Registration', () => {
  it('should register with valid data', () => { /* ... */ })
  it('should reject with empty username', () => { /* ... */ })
  it('should reject with short password', () => { /* ... */ })
  it('should reject with duplicate username', () => { /* ... */ })
  it('should reject with invalid email', () => { /* ... */ })
})
```

### 5. 使用测试夹具

```typescript
// ❌ 硬编码测试数据
it('should create user', async () => {
  const response = await client.post('/api/users', {
    username: 'testuser123',
    password: 'Password123!',
    email: 'test@example.com'
  })
})

// ✅ 使用数据构建器
it('should create user', async () => {
  const userData = TestDataBuilder.user()
  const response = await client.post('/api/users', userData)
})
```

## 常见问题

### Q: 如何测试需要认证的 API？

```typescript
let token: string

beforeEach(async () => {
  const response = await client.post('/api/auth/login', {
    username: 'testuser',
    password: 'password'
  })
  token = response.data.token
  client.setAuth(token)
})

afterEach(() => {
  client.clearAuth()
})
```

### Q: 如何测试文件上传？

```typescript
it('should upload file', async () => {
  const formData = new FormData()
  formData.append('file', new Blob(['test content']), 'test.txt')

  const response = await client.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  assert.api.isOk(response)
})
```

### Q: 如何模拟网络错误？

```typescript
import { vi } from 'vitest'

it('should handle network error', async () => {
  vi.spyOn(global, 'fetch').mockRejectedValueOnce(
    new Error('Network error')
  )

  await expect(client.get('/api/users')).rejects.toThrow('Network error')
})
```

## 参考资料

- [Vitest 文档](https://vitest.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [Nuxt Testing 文档](https://nuxt.com/docs/getting-started/testing)
