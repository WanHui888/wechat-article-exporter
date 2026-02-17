import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './test-reports/coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'test-reports/',
        '*.config.{js,ts}',
        '.nuxt/',
        '.output/',
        'dist/',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
