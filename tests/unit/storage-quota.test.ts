import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  StorageQuotaManager,
  createQuotaManager,
  QuotaPresets,
  type StorageQuotaConfig,
  type QuotaUsage,
} from '~/server/utils/storage-quota'

/**
 * Storage Quota Manager 单元测试
 *
 * 测试覆盖：
 * 1. calculateDirectorySize - 目录大小计算
 * 2. getFileSizes - 获取文件大小信息
 * 3. calculateUsage - 计算配额使用情况
 * 4. checkQuota - 配额检查
 * 5. checkDirectoryQuota - 目录配额检查
 * 6. formatBytes - 字节格式化
 * 7. QuotaPresets - 预定义配额等级
 */

// ==================== Test Helpers ====================

const TEST_DIR = join(process.cwd(), 'tests', 'fixtures', 'quota-test')

/**
 * 创建测试目录结构
 */
function createTestDirectory() {
  // 清理旧的测试目录
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }

  // 创建目录结构
  mkdirSync(TEST_DIR, { recursive: true })
  mkdirSync(join(TEST_DIR, 'subdir1'))
  mkdirSync(join(TEST_DIR, 'subdir2'))
  mkdirSync(join(TEST_DIR, 'subdir2', 'nested'))

  // 创建文件
  writeFileSync(join(TEST_DIR, 'file1.txt'), 'a'.repeat(1024)) // 1KB
  writeFileSync(join(TEST_DIR, 'file2.txt'), 'b'.repeat(2048)) // 2KB
  writeFileSync(join(TEST_DIR, 'subdir1', 'file3.txt'), 'c'.repeat(512)) // 512B
  writeFileSync(join(TEST_DIR, 'subdir2', 'file4.txt'), 'd'.repeat(4096)) // 4KB
  writeFileSync(join(TEST_DIR, 'subdir2', 'nested', 'file5.txt'), 'e'.repeat(256)) // 256B
}

/**
 * 清理测试目录
 */
function cleanTestDirectory() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
}

// ==================== StorageQuotaManager Tests ====================

describe('StorageQuotaManager', () => {
  let manager: StorageQuotaManager

  beforeEach(() => {
    manager = new StorageQuotaManager()
    createTestDirectory()
  })

  afterEach(() => {
    cleanTestDirectory()
  })

  // ==================== calculateDirectorySize() 测试 ====================

  describe('calculateDirectorySize', () => {
    it('should calculate size of directory with files', () => {
      const size = manager.calculateDirectorySize(TEST_DIR)

      // Total: 1KB + 2KB + 512B + 4KB + 256B = 7936 bytes
      expect(size).toBe(7936)
    })

    it('should calculate size of single file', () => {
      const filePath = join(TEST_DIR, 'file1.txt')
      const size = manager.calculateDirectorySize(filePath)

      expect(size).toBe(1024)
    })

    it('should return 0 for non-existent path', () => {
      const size = manager.calculateDirectorySize(join(TEST_DIR, 'non-existent'))

      expect(size).toBe(0)
    })

    it('should handle empty directory', () => {
      const emptyDir = join(TEST_DIR, 'empty')
      mkdirSync(emptyDir)

      const size = manager.calculateDirectorySize(emptyDir)

      expect(size).toBe(0)
    })

    it('should calculate size recursively by default', () => {
      const size = manager.calculateDirectorySize(TEST_DIR, { recursive: true })

      expect(size).toBe(7936)
    })

    it('should calculate size non-recursively when specified', () => {
      const size = manager.calculateDirectorySize(TEST_DIR, { recursive: false })

      // Only file1.txt (1KB) and file2.txt (2KB) in root
      expect(size).toBe(3072)
    })

    it('should exclude files matching patterns', () => {
      const size = manager.calculateDirectorySize(TEST_DIR, {
        exclude: [/file1\.txt$/],
      })

      // Total - file1.txt (1KB) = 6912 bytes
      expect(size).toBe(6912)
    })

    it('should exclude directories matching patterns', () => {
      const size = manager.calculateDirectorySize(TEST_DIR, {
        exclude: [/subdir2/],
      })

      // Only file1.txt (1KB) + file2.txt (2KB) + subdir1/file3.txt (512B)
      expect(size).toBe(3584)
    })

    it('should respect maxDepth limit', () => {
      const size = manager.calculateDirectorySize(TEST_DIR, {
        maxDepth: 1,
      })

      // maxDepth: 1 means we can read the root directory itself
      // When recursing into subdirectories, maxDepth becomes 0, which returns 0
      // So only root files are counted: file1.txt (1KB) + file2.txt (2KB)
      expect(size).toBe(3072)
    })

    it('should return 0 when maxDepth is 0', () => {
      const subdirSize = manager.calculateDirectorySize(join(TEST_DIR, 'subdir1'), {
        maxDepth: 0,
      })

      expect(subdirSize).toBe(0)
    })

    it('should handle multiple exclude patterns', () => {
      const size = manager.calculateDirectorySize(TEST_DIR, {
        exclude: [/file1\.txt$/, /file2\.txt$/],
      })

      // Total - file1.txt - file2.txt = 4864 bytes
      expect(size).toBe(4864)
    })
  })

  // ==================== getFileSizes() 测试 ====================

  describe('getFileSizes', () => {
    it('should get all file sizes recursively', () => {
      const files = manager.getFileSizes(TEST_DIR)

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('file1.txt'))).toBe(true)
      expect(files.some(f => f.path.includes('file5.txt'))).toBe(true)
    })

    it('should get file sizes non-recursively', () => {
      const files = manager.getFileSizes(TEST_DIR, { recursive: false })

      const filenames = files.map(f => f.path)
      expect(filenames.some(p => p.includes('file1.txt'))).toBe(true)
      expect(filenames.some(p => p.includes('file5.txt'))).toBe(false)
    })

    it('should return correct size information', () => {
      const files = manager.getFileSizes(TEST_DIR)
      const file1 = files.find(f => f.path.includes('file1.txt'))

      expect(file1).toBeDefined()
      expect(file1!.size).toBe(1024)
      expect(file1!.isDirectory).toBe(false)
    })

    it('should identify directories', () => {
      const files = manager.getFileSizes(TEST_DIR)
      const subdir = files.find(f => f.path.includes('subdir1') && f.isDirectory)

      expect(subdir).toBeDefined()
      expect(subdir!.isDirectory).toBe(true)
    })

    it('should exclude files matching patterns', () => {
      const files = manager.getFileSizes(TEST_DIR, {
        exclude: [/file1\.txt$/],
      })

      expect(files.some(f => f.path.includes('file1.txt'))).toBe(false)
    })

    it('should return empty array for non-existent path', () => {
      const files = manager.getFileSizes(join(TEST_DIR, 'non-existent'))

      expect(files).toEqual([])
    })

    it('should handle single file path', () => {
      const filePath = join(TEST_DIR, 'file1.txt')
      const files = manager.getFileSizes(filePath)

      expect(files).toHaveLength(1)
      expect(files[0].path).toBe(filePath)
      expect(files[0].size).toBe(1024)
    })
  })

  // ==================== calculateUsage() 测试 ====================

  describe('calculateUsage', () => {
    it('should calculate usage within limit', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const usage = manager.calculateUsage(5000)

      expect(usage.used).toBe(5000)
      expect(usage.limit).toBe(10000)
      expect(usage.remaining).toBe(5000)
      expect(usage.percentage).toBe(50)
      expect(usage.isExceeded).toBe(false)
      expect(usage.isWarning).toBe(false)
    })

    it('should detect exceeded quota', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const usage = manager.calculateUsage(15000)

      expect(usage.used).toBe(15000)
      expect(usage.remaining).toBe(0)
      expect(usage.percentage).toBe(100)
      expect(usage.isExceeded).toBe(true)
    })

    it('should detect warning threshold', () => {
      const manager = new StorageQuotaManager({
        limit: 10000,
        warningThreshold: 80,
      })
      const usage = manager.calculateUsage(8500)

      expect(usage.percentage).toBe(85)
      expect(usage.isWarning).toBe(true)
      expect(usage.isExceeded).toBe(false)
    })

    it('should handle 0 usage', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const usage = manager.calculateUsage(0)

      expect(usage.used).toBe(0)
      expect(usage.remaining).toBe(10000)
      expect(usage.percentage).toBe(0)
      expect(usage.isExceeded).toBe(false)
      expect(usage.isWarning).toBe(false)
    })

    it('should handle exact limit usage', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const usage = manager.calculateUsage(10000)

      expect(usage.used).toBe(10000)
      expect(usage.remaining).toBe(0)
      expect(usage.percentage).toBe(100)
      expect(usage.isExceeded).toBe(false)
    })

    it('should cap percentage at 100', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const usage = manager.calculateUsage(50000)

      expect(usage.percentage).toBe(100)
    })

    it('should use custom warning threshold', () => {
      const manager = new StorageQuotaManager({
        limit: 10000,
        warningThreshold: 90,
      })

      const usage1 = manager.calculateUsage(8500)
      expect(usage1.isWarning).toBe(false)

      const usage2 = manager.calculateUsage(9500)
      expect(usage2.isWarning).toBe(true)
    })
  })

  // ==================== checkQuota() 测试 ====================

  describe('checkQuota', () => {
    it('should allow operation within quota', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(5000, 2000)

      expect(result.allowed).toBe(true)
      expect(result.usage.used).toBe(5000)
      expect(result.projectedUsage?.used).toBe(7000)
      expect(result.error).toBeUndefined()
    })

    it('should deny operation when current usage exceeds quota', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(15000, 1000)

      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Storage quota exceeded')
    })

    it('should deny operation when projected usage would exceed quota', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(8000, 3000)

      expect(result.allowed).toBe(false)
      expect(result.error).toContain('exceed your storage quota')
      expect(result.projectedUsage?.isExceeded).toBe(true)
    })

    it('should allow operation at exact limit', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(8000, 2000)

      expect(result.allowed).toBe(true)
      expect(result.projectedUsage?.used).toBe(10000)
      expect(result.projectedUsage?.isExceeded).toBe(false)
    })

    it('should check current usage without additional size', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(5000)

      expect(result.allowed).toBe(true)
      expect(result.usage.used).toBe(5000)
      expect(result.projectedUsage).toBeUndefined()
    })

    it('should provide detailed error message for quota exceeded', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(12000)

      expect(result.error).toMatch(/Used.*of.*/)
    })

    it('should provide detailed error message for projected overflow', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(8000, 5000)

      expect(result.error).toMatch(/Required:.*Available:.*/)
    })

    it('should allow all operations when quota disabled', () => {
      const manager = new StorageQuotaManager({
        limit: 10000,
        enabled: false,
      })
      const result = manager.checkQuota(50000, 50000)

      expect(result.allowed).toBe(true)
    })

    it('should handle 0 additional size', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(5000, 0)

      expect(result.allowed).toBe(true)
      expect(result.projectedUsage).toBeUndefined()
    })

    it('should handle negative remaining space', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkQuota(15000)

      expect(result.usage.remaining).toBe(0)
      expect(result.allowed).toBe(false)
    })
  })

  // ==================== checkDirectoryQuota() 测试 ====================

  describe('checkDirectoryQuota', () => {
    it('should check quota for existing directory', () => {
      const manager = new StorageQuotaManager({ limit: 100000 })
      const result = manager.checkDirectoryQuota(TEST_DIR)

      expect(result.allowed).toBe(true)
      expect(result.usage.used).toBe(7936)
    })

    it('should check quota with additional size', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkDirectoryQuota(TEST_DIR, 5000)

      expect(result.allowed).toBe(false)
      expect(result.projectedUsage?.isExceeded).toBe(true)
    })

    it('should handle non-existent directory', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const result = manager.checkDirectoryQuota(join(TEST_DIR, 'non-existent'))

      expect(result.allowed).toBe(true)
      expect(result.usage.used).toBe(0)
    })

    it('should deny upload when directory already exceeds quota', () => {
      const manager = new StorageQuotaManager({ limit: 5000 })
      const result = manager.checkDirectoryQuota(TEST_DIR, 1000)

      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Storage quota exceeded')
    })
  })

  // ==================== formatBytes() 测试 ====================

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      const formatted = manager.formatBytes(0)
      expect(formatted).toBe('0 Bytes')
    })

    it('should format bytes', () => {
      const formatted = manager.formatBytes(500)
      expect(formatted).toBe('500 Bytes')
    })

    it('should format kilobytes', () => {
      const formatted = manager.formatBytes(1024)
      expect(formatted).toBe('1 KB')
    })

    it('should format megabytes', () => {
      const formatted = manager.formatBytes(1024 * 1024)
      expect(formatted).toBe('1 MB')
    })

    it('should format gigabytes', () => {
      const formatted = manager.formatBytes(1024 * 1024 * 1024)
      expect(formatted).toBe('1 GB')
    })

    it('should format terabytes', () => {
      const formatted = manager.formatBytes(1024 * 1024 * 1024 * 1024)
      expect(formatted).toBe('1 TB')
    })

    it('should format with decimals', () => {
      const formatted = manager.formatBytes(1536, 2)
      expect(formatted).toBe('1.5 KB')
    })

    it('should handle custom decimal places', () => {
      const formatted = manager.formatBytes(1536, 0)
      expect(formatted).toBe('2 KB')
    })

    it('should format fractional values', () => {
      const formatted = manager.formatBytes(1536, 3)
      expect(formatted).toBe('1.5 KB')
    })

    it('should format large values', () => {
      const formatted = manager.formatBytes(5.5 * 1024 * 1024 * 1024)
      expect(formatted).toBe('5.5 GB')
    })
  })

  // ==================== getConfig() & updateConfig() 测试 ====================

  describe('getConfig and updateConfig', () => {
    it('should return current config', () => {
      const manager = new StorageQuotaManager({
        limit: 50000,
        warningThreshold: 75,
      })
      const config = manager.getConfig()

      expect(config.limit).toBe(50000)
      expect(config.warningThreshold).toBe(75)
      expect(config.enabled).toBe(true)
    })

    it('should update config', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      manager.updateConfig({ limit: 20000 })

      const config = manager.getConfig()
      expect(config.limit).toBe(20000)
    })

    it('should partially update config', () => {
      const manager = new StorageQuotaManager({
        limit: 10000,
        warningThreshold: 80,
      })
      manager.updateConfig({ warningThreshold: 90 })

      const config = manager.getConfig()
      expect(config.limit).toBe(10000)
      expect(config.warningThreshold).toBe(90)
    })

    it('should not mutate original config', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const config1 = manager.getConfig()
      config1.limit = 20000

      const config2 = manager.getConfig()
      expect(config2.limit).toBe(10000)
    })
  })

  // ==================== getMaxAllowedFileSize() 测试 ====================

  describe('getMaxAllowedFileSize', () => {
    it('should calculate max allowed file size', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const maxSize = manager.getMaxAllowedFileSize(3000)

      expect(maxSize).toBe(7000)
    })

    it('should return 0 when quota exceeded', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const maxSize = manager.getMaxAllowedFileSize(15000)

      expect(maxSize).toBe(0)
    })

    it('should return full limit when nothing used', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const maxSize = manager.getMaxAllowedFileSize(0)

      expect(maxSize).toBe(10000)
    })

    it('should return unlimited when quota disabled', () => {
      const manager = new StorageQuotaManager({
        limit: 10000,
        enabled: false,
      })
      const maxSize = manager.getMaxAllowedFileSize(5000)

      expect(maxSize).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should handle exact limit usage', () => {
      const manager = new StorageQuotaManager({ limit: 10000 })
      const maxSize = manager.getMaxAllowedFileSize(10000)

      expect(maxSize).toBe(0)
    })
  })
})

// ==================== createQuotaManager() 测试 ====================

describe('createQuotaManager', () => {
  it('should create manager with default config', () => {
    const manager = createQuotaManager()
    const config = manager.getConfig()

    expect(config.limit).toBe(1024 * 1024 * 1024) // 1GB
    expect(config.enabled).toBe(true)
  })

  it('should create manager with custom config', () => {
    const manager = createQuotaManager({ limit: 50000 })
    const config = manager.getConfig()

    expect(config.limit).toBe(50000)
  })

  it('should return StorageQuotaManager instance', () => {
    const manager = createQuotaManager()

    expect(manager).toBeInstanceOf(StorageQuotaManager)
  })
})

// ==================== QuotaPresets 测试 ====================

describe('QuotaPresets', () => {
  it('should have free preset', () => {
    expect(QuotaPresets.free).toEqual({
      limit: 100 * 1024 * 1024,
      warningThreshold: 80,
    })
  })

  it('should have basic preset', () => {
    expect(QuotaPresets.basic).toEqual({
      limit: 1 * 1024 * 1024 * 1024,
      warningThreshold: 80,
    })
  })

  it('should have pro preset', () => {
    expect(QuotaPresets.pro).toEqual({
      limit: 10 * 1024 * 1024 * 1024,
      warningThreshold: 85,
    })
  })

  it('should have enterprise preset', () => {
    expect(QuotaPresets.enterprise).toEqual({
      limit: 100 * 1024 * 1024 * 1024,
      warningThreshold: 90,
    })
  })

  it('should have unlimited preset', () => {
    expect(QuotaPresets.unlimited).toEqual({
      limit: Number.MAX_SAFE_INTEGER,
      warningThreshold: 100,
      enabled: false,
    })
  })

  it('should work with StorageQuotaManager', () => {
    const manager = new StorageQuotaManager(QuotaPresets.pro)
    const config = manager.getConfig()

    expect(config.limit).toBe(10 * 1024 * 1024 * 1024)
    expect(config.warningThreshold).toBe(85)
  })
})

// ==================== Integration Scenarios 测试 ====================

describe('Integration Scenarios', () => {
  beforeEach(() => {
    createTestDirectory()
  })

  afterEach(() => {
    cleanTestDirectory()
  })

  it('should validate file upload scenario', () => {
    const manager = new StorageQuotaManager({ limit: 20000 })
    const currentUsed = manager.calculateDirectorySize(TEST_DIR)
    const uploadSize = 5000

    const result = manager.checkQuota(currentUsed, uploadSize)

    expect(result.allowed).toBe(true)
    expect(result.usage.used).toBe(7936)
    expect(result.projectedUsage?.used).toBe(12936)
  })

  it('should reject file upload exceeding quota', () => {
    const manager = new StorageQuotaManager({ limit: 10000 })
    const currentUsed = manager.calculateDirectorySize(TEST_DIR)
    const uploadSize = 5000

    const result = manager.checkQuota(currentUsed, uploadSize)

    expect(result.allowed).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should track quota usage across multiple operations', () => {
    const manager = new StorageQuotaManager({ limit: 20000 })
    let currentUsed = manager.calculateDirectorySize(TEST_DIR)

    // First upload
    const result1 = manager.checkQuota(currentUsed, 5000)
    expect(result1.allowed).toBe(true)
    currentUsed += 5000

    // Second upload
    const result2 = manager.checkQuota(currentUsed, 5000)
    expect(result2.allowed).toBe(true)
    currentUsed += 5000

    // Third upload should fail
    const result3 = manager.checkQuota(currentUsed, 5000)
    expect(result3.allowed).toBe(false)
  })

  it('should warn when approaching quota limit', () => {
    const manager = new StorageQuotaManager({
      limit: 10000,
      warningThreshold: 80,
    })
    const usage = manager.calculateUsage(8500)

    expect(usage.isWarning).toBe(true)
    expect(usage.isExceeded).toBe(false)
  })

  it('should handle different user tiers', () => {
    const freeUser = new StorageQuotaManager(QuotaPresets.free)
    const proUser = new StorageQuotaManager(QuotaPresets.pro)

    const currentUsed = 200 * 1024 * 1024 // 200MB

    const freeResult = freeUser.checkQuota(currentUsed)
    const proResult = proUser.checkQuota(currentUsed)

    expect(freeResult.allowed).toBe(false)
    expect(proResult.allowed).toBe(true)
  })

  it('should calculate remaining quota for UI display', () => {
    const manager = new StorageQuotaManager({ limit: 100 * 1024 * 1024 }) // 100MB
    const used = 45 * 1024 * 1024 // 45MB

    const usage = manager.calculateUsage(used)

    expect(manager.formatBytes(usage.used)).toBe('45 MB')
    expect(manager.formatBytes(usage.remaining)).toBe('55 MB')
    expect(usage.percentage).toBe(45)
  })
})
