# 微信公众号文章导出工具 v3.0

<div align="center">

一款专业的微信公众号文章批量下载与导出工具，支持多种格式导出，提供完整的用户管理和数据持久化功能。

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/WanHui888/wechat-article-exporter)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.16-00DC82.svg)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D.svg)](https://vuejs.org/)

</div>

---

## 📖 目录

- [功能特性](#-功能特性)
- [技术栈](#-���术栈)
- [系统架构](#-系统架构)
- [快速开始](#-快速开始)
- [环境变量配置](#-环境变量配置)
- [数据库设置](#-数据库设置)
- [开发指南](#-开发指南)
- [API 文档](#-api-文档)
- [项目结构](#-项目结构)
- [测试](#-测试)
- [部署](#-部署)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## ✨ 功能特性

### 核心功能

- **🔐 用户认证系统**
  - JWT Token 认证机制
  - 用户注册、登录、登出
  - 个人资料管理
  - 密码修改功能

- **📥 微信公众号文章下载**
  - 支持通过微信公众平台后台扫码登录
  - 搜索并订阅公众号
  - 批量获取公众号文章列表
  - 下载文章 HTML 内容
  - 获取文章元数据（标题、作者、发布时间、阅读量、点赞数等）
  - 下载文章评论及回复
  - 支持合集/专辑文章获取

- **📤 多格式导出**
  - **HTML** - 完整的网页格式（保留样式和图片）
  - **JSON** - 结构化数据格式
  - **Excel** - 电子表格格式（.xlsx）
  - **TXT** - 纯文本格式
  - **Markdown** - Markdown 格式
  - **DOCX** - Word 文档格式

- **💾 数据管理**
  - 服务器端 MySQL 数据库持久化存储
  - 文章收藏功能
  - 下载历史记录
  - 导出任务管理
  - 数据备份与恢复

- **🔍 全文搜索**
  - 基于 MeiliSearch 的高性能全文搜索
  - 支持中文分词
  - 实时搜索结果
  - 高亮显示

- **⚙️ 高级功能**
  - 代理配置与管理
  - 速率限制保护
  - 批量导入公众号
  - 自动同步文章
  - 暗黑模式支持
  - 响应式设计（支持移动端）

---

## 🛠 技术栈

### 前端框架

- **[Nuxt 3](https://nuxt.com/)** - Vue.js 全栈框架（SPA 模式）
- **[Vue 3](https://vuejs.org/)** - 渐进式 JavaScript 框架
- **[Pinia](https://pinia.vuejs.org/)** - 状态管理
- **[Arco Design Vue](https://arco.design/vue)** - 企业级 UI 组件库
- **[TailwindCSS](https://tailwindcss.com/)** - 实用优先的 CSS 框架
- **[VueUse](https://vueuse.org/)** - Vue 组合式工具集

### 后端技术

- **[Nitro](https://nitro.unjs.io/)** - 服务器引擎
- **[Drizzle ORM](https://orm.drizzle.team/)** - 类型安全的 ORM
- **[MySQL](https://www.mysql.com/)** - 关系型数据库
- **[MeiliSearch](https://www.meilisearch.com/)** - 全文搜索引擎
- **[Jose](https://github.com/panva/jose)** - JWT 加密库
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - 密码哈希

### 工具库

- **[Cheerio](https://cheerio.js.org/)** - HTML 解析
- **[ExcelJS](https://github.com/exceljs/exceljs)** - Excel 文件生成
- **[Turndown](https://github.com/mixmark-io/turndown)** - HTML 转 Markdown
- **[docx](https://docx.js.org/)** - Word 文档生成
- **[Archiver](https://www.archiverjs.com/)** - 文件压缩
- **[dayjs](https://day.js.org/)** - 日期处理

### 开发工具

- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全
- **[ESLint](https://eslint.org/)** - 代码检查
- **[Vitest](https://vitest.dev/)** - 单元测试
- **[Playwright](https://playwright.dev/)** - E2E 测试

---

## 🏗 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (SPA)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Vue 3 +    │  │   Pinia     │  │  Arco Design│         │
│  │  Nuxt 3     │  │   Store     │  │     Vue     │         │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘         │
│         │                │                                   │
│         └────────────────┴──────────┬────────────────────────┤
│                                     │   Composables          │
└─────────────────────────────────────┼────────────────────────┘
                                      │ HTTP API
┌─────────────────────────────────────┼────────────────────────┐
│                        服务端 (Nitro)                         │
│  ┌──────────────────────────────────┴─────────────────────┐ │
│  │             API Routes (/server/api/)                   │ │
│  │  /auth/*  /data/*  /web/*  /export/*  /search/*       │ │
│  └──────┬────────────────┬────────────────┬───────────────┘ │
│         │                │                │                  │
│  ┌──────▼─────┐   ┌─────▼──────┐   ┌────▼─────────┐       │
│  │   JWT      │   │  Services  │   │ Rate Limiter │       │
│  │ Middleware │   │  (下载/导出) │   │              │       │
│  └────────────┘   └─────┬──────┘   └──────────────┘       │
│                          │                                   │
│  ┌───────────────────────┼────────────────────────────────┐ │
│  │                  数据层                                 │ │
│  │  ┌─────────────┐   ┌─▼──────────┐   ┌──────────────┐  │ │
│  │  │   MySQL     │   │  Drizzle   │   │ MeiliSearch  │  │ │
│  │  │  (持久化)   │◄──┤    ORM     │   │  (全文搜索)  │  │ │
│  │  └─────────────┘   └────────────┘   └──────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP
                          ▼
            ┌──────────────────────────┐
            │   微信公众��台 API        │
            │  (mp.weixin.qq.com)      │
            └──────────────────────────┘
```

### 数据流程

1. **用户认证流程**
   ```
   用户登录 → JWT Token 生成 → 存储到 Cookie → 请求携带 Token → 验证 Token
   ```

2. **文章下载流程**
   ```
   扫码登录微信 → 搜索公众号 → 获取文章列表 → 下载 HTML → 下载元数据 → 存储到 MySQL
   ```

3. **文章导出流程**
   ```
   选择文章 → 创建导出任务 → 格式转换 → 打包文件 → 生成下载链接
   ```

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **MeiliSearch** >= 1.5.0（可选，用于全文搜索）

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/WanHui888/wechat-article-exporter.git
cd wechat-article-exporter
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

创建 `.env` 文件（参考 [环境变量配置](#-环境变量配置)）：

```bash
cp .env.example .env
# 编辑 .env 文件，填入数据库和其他配置
```

#### 4. 设置数据库

```bash
# 生成数据库迁移文件
npm run db:generate

# 执行数据库迁移
npm run db:migrate

# 或者直接推送 schema（开发环境）
npm run db:push
```

#### 5. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

#### 6. 启动 MeiliSearch（可选）

```bash
# 使用 Docker 启动
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=your_master_key \
  getmeili/meilisearch:latest

# 或下载二进制文件
# https://www.meilisearch.com/docs/learn/getting_started/installation
```

---

## 🔧 环境变量配置

创建 `.env` 文件，配置以下环境变量：

```bash
# JWT 认证配置
JWT_SECRET=your-super-secret-jwt-key-change-me
JWT_EXPIRES_IN=7d

# MySQL 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wechat_exporter

# MeiliSearch 配置（可选）
MEILI_HOST=http://localhost:7700
MEILI_KEY=your_meilisearch_master_key

# 数据存储目录
DATA_DIR=./data
BACKUP_DIR=./data/backups
```

### 配置说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `JWT_SECRET` | JWT 签名密钥（生产环境必须修改） | `change-me-in-production-please` | ⚠️ 建议修改 |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` | ❌ |
| `DB_HOST` | MySQL 主机地址 | `localhost` | ✅ |
| `DB_PORT` | MySQL 端口 | `3306` | ❌ |
| `DB_USER` | MySQL 用户名 | `root` | ✅ |
| `DB_PASSWORD` | MySQL 密码 | `''` | ✅ |
| `DB_NAME` | 数据库名称 | `wechat_exporter` | ✅ |
| `MEILI_HOST` | MeiliSearch 地址 | `http://localhost:7700` | ❌ |
| `MEILI_KEY` | MeiliSearch 密钥 | `''` | ❌ |
| `DATA_DIR` | 数据存储目录 | `./data` | ❌ |
| `BACKUP_DIR` | 备份目录 | `./data/backups` | ❌ |

---

## 💾 数据库设置

### 创建数据库

```sql
CREATE DATABASE wechat_exporter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 数据库表结构

使用 Drizzle ORM 管理数据库 schema，主要表包括：

- `users` - 用户表
- `accounts` - 公众号账号表
- `articles` - 文章表
- `article_html` - 文章 HTML 内容表
- `article_metadata` - 文章元数据表
- `article_comments` - 文章评论表
- `article_resources` - 文章资源（图片、视频等）表
- `favorites` - 收藏表
- `export_jobs` - 导出任务表
- `credentials` - 微信登录凭证表
- `preferences` - 用户偏好设置表
- `download_logs` - 下载日志表

### 数据库迁移命令

```bash
# 生成迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate

# 直接推送 schema（开发环境）
npm run db:push

# 打开 Drizzle Studio 查看数据
npm run db:studio
```

---

## 👨‍💻 开发指南

### 开发命令

```bash
# 启动开发服务器（支持热重载）
npm run dev

# 构建生产版本
npm run build

# 预览生产���本
npm run preview

# 运行 ESLint 检查
npm run lint

# 运行 TypeScript 类型检查
npm run typecheck
```

### 代码规范

- 使用 **ESLint** 进行代码检查
- 使用 **TypeScript** 严格模式
- 遵循 **Vue 3 Composition API** 风格
- 组件使用 **setup script** 语法糖

### 推荐的 VSCode 扩展

- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) - Vue 3 语言支持
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) - 代码检查
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) - TailwindCSS 智能提示

---

## 📡 API 文档

### 认证 API

#### POST `/api/auth/register`
注册新用户

**请求体：**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### POST `/api/auth/login`
用户登录

**请求体：**
```json
{
  "email": "string",
  "password": "string"
}
```

**响应：**
```json
{
  "user": {
    "id": "number",
    "username": "string",
    "email": "string"
  },
  "token": "string"
}
```

#### POST `/api/auth/logout`
用户登出

#### GET `/api/auth/me`
获取当前用户信息

---

### 微信登录 API

#### GET `/api/web/login/getqrcode`
获取微信扫码登录二维码

**响应：**
```json
{
  "qrcode": "string (base64)",
  "sessionId": "string"
}
```

#### GET `/api/web/login/scan`
轮询扫码状态

**查询参数：**
- `sessionId`: 会话 ID

---

### 公众号管理 API

#### GET `/api/web/mp/searchbiz`
搜索公众号

**查询参数：**
- `query`: 搜索关键词
- `sessionId`: 微信登录会话 ID

#### GET `/api/web/mp/appmsgpublish`
获取公众号文章列表

**查询参数：**
- `fakeid`: 公众号 ID
- `offset`: 偏移量
- `count`: 数量

---

### 数据管理 API

#### GET `/api/data/accounts`
获取已订阅公众号列表

#### POST `/api/data/accounts`
添加公众号

#### GET `/api/data/articles`
获取文章列表

**查询参数：**
- `accountId`: 公众号 ID（可选）
- `page`: 页码
- `limit`: 每页数量

#### POST `/api/data/articles-favorite`
收藏/取消收藏文章

---

### 导出 API

#### POST `/api/export/create`
创建导出任务

**请求体：**
```json
{
  "articleIds": ["number[]"],
  "format": "html | json | excel | txt | markdown | docx",
  "options": {
    "includeComments": "boolean",
    "includeImages": "boolean"
  }
}
```

#### GET `/api/export/jobs`
获取导出任务列表

#### GET `/api/export/download/[id]`
下载导出文件

---

### 搜索 API

#### GET `/api/search/articles`
全文搜索文章

**查询参数：**
- `q`: 搜索关键词
- `page`: 页码
- `limit`: 每页数量

---

## 📁 项目结构

```
wechat-article-exporter-v3/
├── assets/                     # 静态资源
│   └── css/                    # 样式文件
├── components/                 # Vue 组件
│   ├── auth/                   # 认证相关组件
│   ├── layout/                 # 布局组件
│   └── modal/                  # 模态框组件
├── composables/                # 组合式函数
│   ├── useAuth.ts              # 认证逻辑
│   ├── useDataStore.ts         # 数据存储
│   ├── useExporter.ts          # 导出逻辑
│   ├── useNotification.ts      # 通知
│   ├── usePreferences.ts       # 用户偏好
│   └── useTheme.ts             # 主题切换
├── middleware/                 # 中间件
│   └── auth.ts                 # 认证中间件
├── pages/                      # 页面路由
│   ├── index.vue               # 首页
│   ├── login.vue               # 登录页
│   ├── register.vue            # 注册页
│   └── dashboard/              # 仪表盘页面
│       ├── index.vue           # 概览
│       ├── account.vue         # 公众号管理
│       ├── article.vue         # 文章列表
│       ├── single.vue          # 单篇文章下载
│       ├── album.vue           # 合集管理
│       ├── favorites.vue       # 我的收藏
│       ├── search.vue          # 全文搜索
│       ├── exports.vue         # 导出管理
│       ├── history.vue         # 下载历史
│       ├── proxy.vue           # 代理配置
│       ├── settings.vue        # 设置
│       └── admin/              # 管理员功能
│           ├── tasks.vue       # 任务管理
│           ├── monitor.vue     # 系统监控
│           └── users.vue       # 用户管理
├── plugins/                    # Nuxt 插件
│   └── arco-design.client.ts  # Arco Design 插件
├── server/                     # 服务器端代码
│   ├── api/                    # API 路由
│   │   ├── auth/               # 认证 API
│   │   ├── data/               # 数据管理 API
│   │   ├── export/             # 导出 API
│   │   ├── search/             # 搜索 API
│   │   └── web/                # 微信 API 代理
│   ├── database/               # 数据库
│   │   ├── index.ts            # 数据库连接
│   │   └── schema.ts           # 数据库 schema
│   ├── services/               # 业务逻辑服务
│   │   ├── download.service.ts # 下载服务
│   │   └── export.service.ts   # 导出服务
│   └── utils/                  # 工具函数
│       ├── jwt.ts              # JWT 工具
│       ├── password.ts         # 密码哈希
│       ├── proxy-request.ts    # 代理请求
│       └── rate-limiter.ts     # 速率限制
├── stores/                     # Pinia 状态管理
│   ├── auth.ts                 # 认证状态
│   ├── articles.ts             # 文章状态
│   └── ui.ts                   # UI 状态
├── tests/                      # 测试文件
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── e2e/                    # E2E 测试
├── types/                      # TypeScript 类型定义
│   └── index.ts
├── .env.example                # 环境变量示例
├── .gitignore                  # Git 忽略文件
├── CLAUDE.md                   # Claude Code 指南
├── drizzle.config.ts           # Drizzle ORM 配置
├── nuxt.config.ts              # Nuxt 配置
├── package.json                # 项目配置
├── README.md                   # 项目文档
├── tailwind.config.js          # Tailwind 配置
└── tsconfig.json               # TypeScript 配置
```

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e
```

### 测试框架

- **单元测试 / 集成测试**: [Vitest](https://vitest.dev/)
- **E2E 测试**: [Playwright](https://playwright.dev/)

---

## 🚢 部署

### 构建生产版本

```bash
npm run build
```

构建输出在 `.output/` 目录。

### 部署方式

#### 1. Node.js 服务器

```bash
# 构建
npm run build

# 启动服务器
node .output/server/index.mjs
```

#### 2. Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", ".output/server/index.mjs"]
```

构建和运行：

```bash
# 构建镜像
docker build -t wechat-article-exporter .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --name wechat-exporter \
  -e DB_HOST=your_db_host \
  -e DB_PASSWORD=your_db_password \
  -e JWT_SECRET=your_jwt_secret \
  wechat-article-exporter
```

#### 3. Docker Compose 部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=mysql
      - DB_USER=root
      - DB_PASSWORD=password
      - DB_NAME=wechat_exporter
      - MEILI_HOST=http://meilisearch:7700
      - JWT_SECRET=your-secret-key
    depends_on:
      - mysql
      - meilisearch
    volumes:
      - ./data:/app/data

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=wechat_exporter
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  meilisearch:
    image: getmeili/meilisearch:latest
    environment:
      - MEILI_MASTER_KEY=your_master_key
    volumes:
      - meilisearch_data:/meili_data
    ports:
      - "7700:7700"

volumes:
  mysql_data:
  meilisearch_data:
```

启动服务：

```bash
docker-compose up -d
```

---

## ❓ 常见问题

### 1. 如何获取微信公众号 Cookie？

通过扫码登录功能自动获取，无需手动配置。

### 2. 为什么下载失败？

- 检查微信登录是否过期
- 确认网络连接正常
- 查看代理配置是否正确

### 3. 导出文件在哪里？

导出的文件存储在 `data/exports/` 目录下。

### 4. 如何备份数据？

```bash
# 备份 MySQL 数据库
mysqldump -u root -p wechat_exporter > backup.sql

# 备份文件数据
cp -r data/ backup/data/
```

### 5. 忘记管理员密码怎么办？

通过数据库直接修改密码��希值或重新创建用户。

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链相关

---

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

---

## 🙏 致谢

- 感谢 [Nuxt](https://nuxt.com/) 和 [Vue](https://vuejs.org/) 团队
- 感谢 [Arco Design](https://arco.design/) 提供的优秀 UI 组件
- 感谢所有贡献者

---

## 📞 联系方式

- GitHub: [@WanHui888](https://github.com/WanHui888)
- Issues: [提交问题](https://github.com/WanHui888/wechat-article-exporter/issues)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ by WanHui888

</div>
