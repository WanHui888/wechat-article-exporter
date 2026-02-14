export default defineNuxtConfig({
  ssr: false,

  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  css: [
    '@arco-design/web-vue/dist/arco.css',
    '~/assets/css/main.css',
  ],

  app: {
    head: {
      title: '微信公众号文章导出工具',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '微信公众号文章批量导出工具 v3' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production-please',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '3306'),
    dbUser: process.env.DB_USER || 'root',
    dbPassword: process.env.DB_PASSWORD || '',
    dbName: process.env.DB_NAME || 'wechat_exporter',
    meiliHost: process.env.MEILI_HOST || 'http://localhost:7700',
    meiliKey: process.env.MEILI_KEY || '',
    dataDir: process.env.DATA_DIR || './data',
    backupDir: process.env.BACKUP_DIR || './data/backups',
    public: {
      appName: '微信公众号文章导出工具',
      appVersion: '3.0.0',
    },
  },

  nitro: {
    experimental: {
      asyncContext: true,
    },
    storage: {
      data: {
        driver: 'fs',
        base: './data',
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  tailwindcss: {
    configPath: '~/tailwind.config.js',
  },

  compatibilityDate: '2025-01-01',
})
