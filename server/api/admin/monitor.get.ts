import { eq, sql, desc, and } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'
import { execSync } from 'child_process'
import os from 'os'

function getDiskUsage(): { total: number; used: number; free: number; percent: number } {
  try {
    const platform = os.platform()
    if (platform === 'win32') {
      // Windows: use wmic to get disk info for the system drive
      const output = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv', {
        encoding: 'utf-8',
        timeout: 5000,
      })
      const lines = output.trim().split('\n').filter(l => l.trim())
      const lastLine = lines[lines.length - 1]!
      const parts = lastLine.split(',')
      const free = parseInt(parts[1]!) || 0
      const total = parseInt(parts[2]!) || 0
      const used = total - free
      return {
        total,
        used,
        free,
        percent: total > 0 ? Math.round((used / total) * 100) : 0,
      }
    } else {
      // Linux/macOS: use df
      const output = execSync('df -B1 / | tail -1', { encoding: 'utf-8', timeout: 5000 })
      const parts = output.trim().split(/\s+/)
      const total = parseInt(parts[1]!) || 0
      const used = parseInt(parts[2]!) || 0
      const free = parseInt(parts[3]!) || 0
      return {
        total,
        used,
        free,
        percent: total > 0 ? Math.round((used / total) * 100) : 0,
      }
    }
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0 }
  }
}

export default defineEventHandler(async (event) => {
  // Check admin role
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const db = getDb()

  // Get system stats
  const cpus = os.cpus()
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
    const idle = cpu.times.idle
    return acc + ((total - idle) / total) * 100
  }, 0) / cpus.length

  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPercent = Math.round((usedMem / totalMem) * 100)

  // Get disk usage
  const disk = getDiskUsage()

  // Get user count
  const userCountResult = await db.select({ count: sql<number>`count(*)` })
    .from(schema.users)
  const userCount = userCountResult[0]?.count || 0

  // Get article count
  const articleCountResult = await db.select({ count: sql<number>`count(*)` })
    .from(schema.articles)
  const articleCount = articleCountResult[0]?.count || 0

  // Get total storage
  const storageResult = await db.select({
    total: sql<number>`COALESCE(SUM(storage_used), 0)`,
  }).from(schema.users)
  const storageUsed = storageResult[0]?.total || 0

  return {
    success: true,
    data: {
      cpu: Math.round(cpuUsage),
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percent: memPercent,
      },
      disk,
      userCount,
      articleCount,
      storageUsed,
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
      nodeVersion: process.version,
    },
  }
})
