/**
 * 健康检查端点
 *
 * 用于 Kubernetes/Docker 健康检查，监控系统状态
 */

import { sql } from 'drizzle-orm'
import { getDb } from '~/server/database'
import { promises as fs } from 'fs'
import { join } from 'path'

interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  message?: string
}

export default defineEventHandler(async (event) => {
  const checks: Record<string, HealthCheck> = {}

  // 1. 数据库连接检查
  try {
    const db = getDb()
    await db.execute(sql`SELECT 1`)
    checks.database = { status: 'healthy' }
  } catch (error: any) {
    checks.database = {
      status: 'unhealthy',
      message: error.message,
    }
  }

  // 2. MeiliSearch 检查（可选服务）
  try {
    const config = useRuntimeConfig()
    if (config.meiliHost) {
      const response = await fetch(`${config.meiliHost}/health`, {
        signal: AbortSignal.timeout(3000), // 3秒超时
      })
      checks.meilisearch = {
        status: response.ok ? 'healthy' : 'unhealthy',
        message: response.ok ? undefined : `HTTP ${response.status}`,
      }
    } else {
      checks.meilisearch = { status: 'healthy', message: 'not configured' }
    }
  } catch (error: any) {
    checks.meilisearch = {
      status: 'unhealthy',
      message: error.message,
    }
  }

  // 3. 文件系统检查
  try {
    const config = useRuntimeConfig()
    const testFile = join(config.dataDir, '.health-check')
    await fs.writeFile(testFile, 'ok')
    await fs.unlink(testFile)
    checks.filesystem = { status: 'healthy' }
  } catch (error: any) {
    checks.filesystem = {
      status: 'unhealthy',
      message: error.message,
    }
  }

  // 4. 计算整体健康状态
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy')
  const degraded = Object.values(checks).some(c => c.status === 'unhealthy')

  // 设置响应状态码
  setResponseStatus(event, allHealthy ? 200 : (degraded ? 503 : 200))

  return {
    status: allHealthy ? 'healthy' : (degraded ? 'unhealthy' : 'degraded'),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  }
})
