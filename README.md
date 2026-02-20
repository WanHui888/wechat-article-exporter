<p align="center">
  <img src="./assets/logo.svg" alt="Logo" width="80">
</p>

<h1 align="center">wechat-article-exporter</h1>

<p align="center">微信公众号文章批量下载工具 · 个人私有化部署版</p>

<p align="center">
  <img src="https://img.shields.io/github/license/WanHui888/wechat-article-exporter?label=License" alt="License">
  <img src="https://img.shields.io/github/package-json/v/WanHui888/wechat-article-exporter" alt="Version">
</p>

---

## 简介

基于 [wechat-article-exporter](https://github.com/wechat-article/wechat-article-exporter) 二次开发的个人私有化部署版本，在原版基础上进行了以下改进：

- **IndexedDB → SQLite 迁移**：数据存储从浏览器 IndexedDB 迁移至服务端 SQLite，数据更稳定持久
- **合集"已购买"标识**：合集下拉菜单中自动标注已购买的付费合集
- **深色/浅色主题切换**：右上角一键切换黑白主题
- **��空本地数据按钮**：右上角支持一键清空所有本地数据

## 特性

- [x] 搜索公众号，支持关键字搜索
- [x] 支持导出 HTML / JSON / Excel / TXT / Markdown / DOCX 格式
- [x] HTML 格式打包图片和样式，100% 还原文章排版
- [x] 缓存文章列表数据，减少接口请求次数（SQLite 存储）
- [x] 支持文章过滤：作者、标题、发布时间、原创标识、所属合集
- [x] 支持合集下载，自动标注已购买合集
- [x] 支持导出评论��阅读量、转发量等数据
- [x] 支持深色/浅色主题切换
- [x] 支持 Docker 部署

## 快速开始

### 环境要求

- Node.js >= 22
- Yarn 1.22.22

### 本地运行

```bash
# 安装 Yarn
corepack enable && corepack prepare yarn@1.22.22 --activate

# 克隆项目
git clone https://github.com/WanHui888/wechat-article-exporter.git
cd wechat-article-exporter

# 安装依赖
yarn install

# 启动开发服务器（Windows）
set NUXT_HOST=127.0.0.1 && set NUXT_PORT=3100 && yarn dev

# 启动开发服务器（macOS/Linux）
NUXT_HOST=127.0.0.1 NUXT_PORT=3100 yarn dev
```

访问 http://127.0.0.1:3100

### Docker 部署

```bash
yarn docker:build
yarn docker:publish
```

## 数据存储

所有数据存储在项目根目录的 `.data/exporter.sqlite`，首次运行自动创建。

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

```
SQLITE_PATH=.data/exporter.sqlite   # SQLite 数据库路径
NUXT_DEBUG_MP_REQUEST=false          # 是否开启微信请求调试日志
NUXT_AGGRID_LICENSE=                 # AG-Grid Enterprise 许可证（可选）
NITRO_KV_DRIVER=fs                   # KV 驱动: fs | memory
NITRO_KV_BASE=.data/kv               # KV 存储路径
```

## 原理

在公众号后台写文章时，支持搜索其他公众号的文章功能，本工具以此为数据来源，实现抓取指定公众号所有文章的目的。

## 声明

- 本工具仅供个人学习和研究使用
- 不提供付费文章破解服务
- 通过本程序获取的文章内容，版权归原作者所有，请合理使用

## License

MIT © [WanHui888](https://github.com/WanHui888)
