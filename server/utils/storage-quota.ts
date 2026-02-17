/**
 * 存储配额检查机制
 *
 * 功能：
 * 1. 计算用户已使用的存储空间
 * 2. 检查是否超过配额限制
 * 3. 预检查文件上传是否会超过配额
 * 4. 提供配额使用情况报告
 * 5. 支持不同用户级别的配额设置
 */

import { existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 存储配额配置
 */
export interface StorageQuotaConfig {
  /** 配额限制（字节） */
  limit: number
  /** 警告阈值（百分比，0-100） */
  warningThreshold?: number
  /** 是否启用配额检查 */
  enabled?: boolean
}

/**
 * 配额使用情况
 */
export interface QuotaUsage {
  /** 已使用空间（字节） */
  used: number
  /** 配额限制（字节） */
  limit: number
  /** 剩余空间（字节） */
  remaining: number
  /** 使用百分比（0-100） */
  percentage: number
  /** 是否超过限制 */
  isExceeded: boolean
  /** 是否达到警告阈值 */
  isWarning: boolean
}

/**
 * 文件大小信息
 */
export interface FileSizeInfo {
  /** 文件路径 */
  path: string
  /** 文件大小（字节） */
  size: number
  /** 是否为目录 */
  isDirectory: boolean
}

/**
 * 配额检查结果
 */
export interface QuotaCheckResult {
  /** 是否允许操作 */
  allowed: boolean
  /** 当前配额使用情况 */
  usage: QuotaUsage
  /** 错误消息（如果不���许） */
  error?: string
  /** 预计操作后的使用情况 */
  projectedUsage?: QuotaUsage
}

/**
 * 默认配额配置
 */
const DEFAULT_QUOTA_CONFIG: Required<StorageQuotaConfig> = {
  limit: 1024 * 1024 * 1024, // 1GB
  warningThreshold: 80, // 80%
  enabled: true,
}

/**
 * 预定义的配额等级
 */
export const QuotaPresets = {
  /** 免费用户：100MB */
  free: {
    limit: 100 * 1024 * 1024,
    warningThreshold: 80,
  },
  /** 基础用户：1GB */
  basic: {
    limit: 1 * 1024 * 1024 * 1024,
    warningThreshold: 80,
  },
  /** 专业用户：10GB */
  pro: {
    limit: 10 * 1024 * 1024 * 1024,
    warningThreshold: 85,
  },
  /** 企业用户：100GB */
  enterprise: {
    limit: 100 * 1024 * 1024 * 1024,
    warningThreshold: 90,
  },
  /** 无限制 */
  unlimited: {
    limit: Number.MAX_SAFE_INTEGER,
    warningThreshold: 100,
    enabled: false,
  },
}

/**
 * 存储配额管理器
 */
export class StorageQuotaManager {
  private config: Required<StorageQuotaConfig>

  constructor(config: StorageQuotaConfig = {}) {
    this.config = { ...DEFAULT_QUOTA_CONFIG, ...config }
  }

  /**
   * 计算目录大小
   *
   * @param dirPath - 目录路径
   * @param options - 计算选项
   * @returns 目录总大小（字节）
   */
  calculateDirectorySize(
    dirPath: string,
    options: {
      /** 是否递归��算子目录 */
      recursive?: boolean
      /** 要排除的文件/目录模式 */
      exclude?: RegExp[]
      /** 最大递归深度 */
      maxDepth?: number
    } = {}
  ): number {
    const { recursive = true, exclude = [], maxDepth = Infinity } = options

    if (!existsSync(dirPath)) {
      return 0
    }

    const stat = statSync(dirPath)

    // 如果是文件，直接返回大小
    if (!stat.isDirectory()) {
      return stat.size
    }

    // 如果达到最大深度，返回 0
    if (maxDepth <= 0) {
      return 0
    }

    let totalSize = 0

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        // 检查是否被排除
        if (exclude.some(pattern => pattern.test(fullPath))) {
          continue
        }

        if (entry.isDirectory()) {
          if (recursive) {
            totalSize += this.calculateDirectorySize(fullPath, {
              recursive,
              exclude,
              maxDepth: maxDepth - 1,
            })
          }
        }
        else if (entry.isFile()) {
          const fileStat = statSync(fullPath)
          totalSize += fileStat.size
        }
      }
    }
    catch (error) {
      // 忽略权限错误等，返回已计算的大小
      console.error(`Error reading directory ${dirPath}:`, error)
    }

    return totalSize
  }

  /**
   * 获取目录下所有文件的大小信息
   *
   * @param dirPath - 目录路径
   * @param options - 获取选项
   * @returns 文件大小信息列表
   */
  getFileSizes(
    dirPath: string,
    options: {
      recursive?: boolean
      exclude?: RegExp[]
    } = {}
  ): FileSizeInfo[] {
    const { recursive = true, exclude = [] } = options
    const results: FileSizeInfo[] = []

    if (!existsSync(dirPath)) {
      return results
    }

    const stat = statSync(dirPath)

    if (!stat.isDirectory()) {
      return [
        {
          path: dirPath,
          size: stat.size,
          isDirectory: false,
        },
      ]
    }

    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (exclude.some(pattern => pattern.test(fullPath))) {
          continue
        }

        if (entry.isDirectory()) {
          results.push({
            path: fullPath,
            size: 0, // 目录本身大小为 0，内容大小需要递归计算
            isDirectory: true,
          })

          if (recursive) {
            results.push(...this.getFileSizes(fullPath, { recursive, exclude }))
          }
        }
        else if (entry.isFile()) {
          const fileStat = statSync(fullPath)
          results.push({
            path: fullPath,
            size: fileStat.size,
            isDirectory: false,
          })
        }
      }
    }
    catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error)
    }

    return results
  }

  /**
   * 计算配额使用情况
   *
   * @param usedSpace - 已使用空间（字节）
   * @returns 配额使用情况
   */
  calculateUsage(usedSpace: number): QuotaUsage {
    const remaining = Math.max(0, this.config.limit - usedSpace)
    const percentage = (usedSpace / this.config.limit) * 100
    const isExceeded = usedSpace > this.config.limit
    const isWarning = percentage >= this.config.warningThreshold

    return {
      used: usedSpace,
      limit: this.config.limit,
      remaining,
      percentage: Math.min(100, percentage),
      isExceeded,
      isWarning,
    }
  }

  /**
   * 检查是否可以存储指定大小的数据
   *
   * @param currentUsed - 当前已使用空间（字节）
   * @param additionalSize - 要添加的数据大小（字节）
   * @returns 检查结果
   */
  checkQuota(currentUsed: number, additionalSize: number = 0): QuotaCheckResult {
    if (!this.config.enabled) {
      return {
        allowed: true,
        usage: this.calculateUsage(currentUsed),
      }
    }

    const usage = this.calculateUsage(currentUsed)
    const projectedUsed = currentUsed + additionalSize
    const projectedUsage = this.calculateUsage(projectedUsed)

    // 如果当前已经超过配额
    if (usage.isExceeded) {
      return {
        allowed: false,
        usage,
        error: `Storage quota exceeded. Used ${this.formatBytes(usage.used)} of ${this.formatBytes(usage.limit)}.`,
      }
    }

    // 如果添加数据后会超过配额
    if (additionalSize > 0 && projectedUsage.isExceeded) {
      return {
        allowed: false,
        usage,
        projectedUsage,
        error: `This operation would exceed your storage quota. Required: ${this.formatBytes(additionalSize)}, Available: ${this.formatBytes(usage.remaining)}.`,
      }
    }

    return {
      allowed: true,
      usage,
      projectedUsage: additionalSize > 0 ? projectedUsage : undefined,
    }
  }

  /**
   * 检查目录配额
   *
   * @param dirPath - 目录路径
   * @param additionalSize - 要添加的数据大小（可选）
   * @returns 检查结果
   */
  checkDirectoryQuota(dirPath: string, additionalSize: number = 0): QuotaCheckResult {
    const currentUsed = this.calculateDirectorySize(dirPath)
    return this.checkQuota(currentUsed, additionalSize)
  }

  /**
   * 格式化字节数为人类可读格式
   *
   * @param bytes - 字节数
   * @param decimals - 小数位数
   * @returns 格式化后的字符串
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
  }

  /**
   * 获取配额配置
   */
  getConfig(): Required<StorageQuotaConfig> {
    return { ...this.config }
  }

  /**
   * 更新配额配置
   */
  updateConfig(config: Partial<StorageQuotaConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取最大允许文件大小
   *
   * @param currentUsed - 当前已使用空间
   * @returns 最大允许文件大小（字节）
   */
  getMaxAllowedFileSize(currentUsed: number): number {
    if (!this.config.enabled) {
      return Number.MAX_SAFE_INTEGER
    }

    return Math.max(0, this.config.limit - currentUsed)
  }
}

/**
 * 创建配额管理器（工厂函数）
 *
 * @param config - 配额配置
 * @returns 配额管理器实例
 */
export function createQuotaManager(config: StorageQuotaConfig = {}): StorageQuotaManager {
  return new StorageQuotaManager(config)
}
