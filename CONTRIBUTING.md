# 贡献指南

感谢您对本项目的兴趣！我们非常欢迎各种形式的贡献，包括但不限于代码、文档、Bug 报告和功能建议。🙌

## 行为准则

本项目遵循 [Contributor Covenant 行为准则](./CODE_OF_CONDUCT.md)。请在所有互动中保持友好和尊重。

## 开发环境搭建

### 克隆仓库

```shell
git clone https://github.com/WanHui888/wechat-article-exporter.git
```

### 安装 NodeJS

> 本项目要求 Node >= 22

按照 Node.js 官方的[安装指��](https://nodejs.org/en/download)进行安装。

### 安装项目依赖

> 本项目使用 yarn@1.22 进行依赖管理

```shell
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn
```

### 本地运行

```shell
# Windows
set NUXT_HOST=127.0.0.1 && set NUXT_PORT=3100 && yarn dev

# macOS/Linux
NUXT_HOST=127.0.0.1 NUXT_PORT=3100 yarn dev
```


## 如何贡献

### 1. 报告 Bug 或建议功能
- 先搜索现有 [Issues](https://github.com/WanHui888/wechat-article-exporter/issues)，避免重复。
- 如果没有找到，创建一个新 Issue。
    - Bug 报告请包含：复现步骤、预期行为、实际行为、环境��息（操作系统、浏览器、版本等）。
    - 功能建议请详细描述需求和使用场景。

### 2. 提交代码
请遵循以��流程：

1. Fork 本仓库。
2. 创建特性分支：`git checkout -b feature/你的功能描述` 或 `fix/你的修复描述`。
3. 安装开发依赖并运行项目（参考 开发环境搭建）。
4. 编写代码，确保：
    - **仅提交必要文件**。
    - 遵循项目代码风格（使用 Biome 格式化工具）。
    - 通过所有测试：`yarn test:e2e`。
5. 提交时使用清晰的 Commit 消息。
6. Push 到你的 Fork 并打开 Pull Request。
    - PR 标题和描述要清晰，引用相关 Issue（如 `fixes #123`）。
    - **如果是重大更改，请先开 Issue 讨论**。

### 3. 代码风格指南
- 代码格式化采用 Biome：`yarn format`
- 变量命名采用 camelCase
