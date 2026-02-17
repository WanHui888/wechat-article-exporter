/**
 * 压缩中间件测试
 *
 * 注意：由于 h3 的 getHeader/setHeader 是通过 Nitro 自动导入的，
 * 难以进行完整的集成测试。这里主要测试可测试的组件。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  CompressionStats,
  COMPRESSION_PRESETS,
} from '../../server/middleware/compression'

describe('Compression Middleware', () => {
  describe('CompressionStats', () => {
    let stats: CompressionStats

    beforeEach(() => {
      stats = new CompressionStats()
    })

    describe('record()', () => {
      it('应该记录单次压缩', () => {
        stats.record(1000, 500)

        const result = stats.getStats()
        expect(result.totalRequests).toBe(1)
        expect(result.compressedRequests).toBe(1)
        expect(result.originalBytes).toBe(1000)
        expect(result.compressedBytes).toBe(500)
      })

      it('应该累积多次压缩', () => {
        stats.record(1000, 500)
        stats.record(2000, 1000)
        stats.record(3000, 1500)

        const result = stats.getStats()
        expect(result.totalRequests).toBe(3)
        expect(result.compressedRequests).toBe(3)
        expect(result.originalBytes).toBe(6000)
        expect(result.compressedBytes).toBe(3000)
      })

      it('应该正确累积不同大小的压缩', () => {
        stats.record(5000, 2000) // 60% 压缩
        stats.record(10000, 3000) // 70% 压缩
        stats.record(2000, 1000) // 50% 压缩

        const result = stats.getStats()
        expect(result.totalRequests).toBe(3)
        expect(result.compressedRequests).toBe(3)
        expect(result.originalBytes).toBe(17000)
        expect(result.compressedBytes).toBe(6000)
      })
    })

    describe('recordSkipped()', () => {
      it('应该记录跳过的请求', () => {
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.totalRequests).toBe(1)
        expect(result.compressedRequests).toBe(0)
      })

      it('应该区分压缩和跳过的请求', () => {
        stats.record(1000, 500)
        stats.recordSkipped()
        stats.record(2000, 1000)
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.totalRequests).toBe(4)
        expect(result.compressedRequests).toBe(2)
      })

      it('应该在只有跳过请求时返回零字节', () => {
        stats.recordSkipped()
        stats.recordSkipped()
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.totalRequests).toBe(3)
        expect(result.compressedRequests).toBe(0)
        expect(result.originalBytes).toBe(0)
        expect(result.compressedBytes).toBe(0)
      })
    })

    describe('getStats()', () => {
      it('应该计算压缩率', () => {
        stats.record(1000, 500)
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.compressionRate).toBe(0.5) // 1/2
      })

      it('应该计算高压缩率场景', () => {
        stats.record(1000, 500)
        stats.record(2000, 1000)
        stats.record(3000, 1500)
        stats.recordSkipped()
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.compressionRate).toBe(0.6) // 3/5
      })

      it('应该计算低压缩率场景', () => {
        stats.record(1000, 500)
        stats.recordSkipped()
        stats.recordSkipped()
        stats.recordSkipped()
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.compressionRate).toBe(0.2) // 1/5
      })

      it('应该计算压缩比', () => {
        stats.record(1000, 500)

        const result = stats.getStats()
        expect(result.compressionRatio).toBe(0.5) // 500/1000
      })

      it('应该计算高压缩比（小文件）', () => {
        stats.record(1000, 200)

        const result = stats.getStats()
        expect(result.compressionRatio).toBe(0.2) // 200/1000 = 80% 节省
      })

      it('应该计算低压缩比（大文件）', () => {
        stats.record(1000, 900)

        const result = stats.getStats()
        expect(result.compressionRatio).toBe(0.9) // 900/1000 = 10% 节省
      })

      it('应该计算节省的字节数', () => {
        stats.record(1000, 600)

        const result = stats.getStats()
        expect(result.savedBytes).toBe(400) // 1000 - 600
      })

      it('应该计算多次压缩的总节省字节数', () => {
        stats.record(1000, 600) // 节省 400
        stats.record(2000, 1000) // 节省 1000
        stats.record(5000, 2000) // 节省 3000

        const result = stats.getStats()
        expect(result.savedBytes).toBe(4400) // 400 + 1000 + 3000
      })

      it('应该计算节省百分比', () => {
        stats.record(1000, 600)

        const result = stats.getStats()
        expect(result.savedPercentage).toBe(40) // (1 - 0.6) * 100
      })

      it('应该计算高节省百分比', () => {
        stats.record(1000, 200)

        const result = stats.getStats()
        expect(result.savedPercentage).toBe(80) // (1 - 0.2) * 100
      })

      it('应该计算低节省百分比', () => {
        stats.record(1000, 900)

        const result = stats.getStats()
        expect(result.savedPercentage).toBeCloseTo(10, 1) // (1 - 0.9) * 100, allow floating point precision
      })

      it('应该处理零原始字节（避免除以零）', () => {
        const result = stats.getStats()

        expect(result.compressionRatio).toBe(1)
        expect(result.savedBytes).toBe(0)
        expect(result.savedPercentage).toBe(0)
      })

      it('应该处理完美压缩（100%节省）', () => {
        stats.record(1000, 0)

        const result = stats.getStats()
        expect(result.compressionRatio).toBe(0)
        expect(result.savedPercentage).toBe(100)
        expect(result.savedBytes).toBe(1000)
      })

      it('应该处理无压缩（0%节省）', () => {
        stats.record(1000, 1000)

        const result = stats.getStats()
        expect(result.compressionRatio).toBe(1)
        expect(result.savedPercentage).toBe(0)
        expect(result.savedBytes).toBe(0)
      })

      it('应该处理只有跳过请求的情况', () => {
        stats.recordSkipped()
        stats.recordSkipped()

        const result = stats.getStats()
        expect(result.totalRequests).toBe(2)
        expect(result.compressedRequests).toBe(0)
        expect(result.compressionRate).toBe(0)
        expect(result.compressionRatio).toBe(1)
        expect(result.savedBytes).toBe(0)
        expect(result.savedPercentage).toBe(0)
      })

      it('应该返回完整的统计信息结构', () => {
        stats.record(1000, 500)
        stats.recordSkipped()

        const result = stats.getStats()

        expect(result).toHaveProperty('totalRequests')
        expect(result).toHaveProperty('compressedRequests')
        expect(result).toHaveProperty('compressionRate')
        expect(result).toHaveProperty('originalBytes')
        expect(result).toHaveProperty('compressedBytes')
        expect(result).toHaveProperty('savedBytes')
        expect(result).toHaveProperty('savedPercentage')
        expect(result).toHaveProperty('compressionRatio')
      })
    })

    describe('reset()', () => {
      it('应���重置所有统计数据', () => {
        stats.record(1000, 500)
        stats.record(2000, 1000)
        stats.recordSkipped()

        stats.reset()

        const result = stats.getStats()
        expect(result.totalRequests).toBe(0)
        expect(result.compressedRequests).toBe(0)
        expect(result.originalBytes).toBe(0)
        expect(result.compressedBytes).toBe(0)
      })

      it('应该允许重置后重新记录', () => {
        stats.record(1000, 500)
        stats.reset()
        stats.record(2000, 1000)

        const result = stats.getStats()
        expect(result.totalRequests).toBe(1)
        expect(result.compressedRequests).toBe(1)
        expect(result.originalBytes).toBe(2000)
        expect(result.compressedBytes).toBe(1000)
      })

      it('应该允许多次重置', () => {
        stats.record(1000, 500)
        stats.reset()
        stats.record(2000, 1000)
        stats.reset()
        stats.record(3000, 1500)

        const result = stats.getStats()
        expect(result.totalRequests).toBe(1)
        expect(result.originalBytes).toBe(3000)
        expect(result.compressedBytes).toBe(1500)
      })
    })

    describe('实际使用场景', () => {
      it('应该正确统计混合场景', () => {
        // 模拟实际请求流
        stats.record(50000, 10000) // 大文件，80% 压缩
        stats.recordSkipped() // 图片文件跳过
        stats.record(5000, 2000) // 中等文件，60% 压缩
        stats.recordSkipped() // 已压缩文件跳过
        stats.record(1000, 500) // 小文件，50% 压缩
        stats.record(20000, 5000) // 大文件，75% 压缩

        const result = stats.getStats()

        expect(result.totalRequests).toBe(6)
        expect(result.compressedRequests).toBe(4)
        expect(result.compressionRate).toBeCloseTo(0.667, 2) // 4/6
        expect(result.originalBytes).toBe(76000)
        expect(result.compressedBytes).toBe(17500)
        expect(result.savedBytes).toBe(58500)
        expect(result.compressionRatio).toBeCloseTo(0.230, 2)
        expect(result.savedPercentage).toBeCloseTo(76.97, 2)
      })

      it('应该处理高流量场景', () => {
        // 模拟 100 个请求
        for (let i = 0; i < 50; i++) {
          stats.record(10000, 3000) // HTML 文件
        }
        for (let i = 0; i < 30; i++) {
          stats.recordSkipped() // 图片文件
        }
        for (let i = 0; i < 20; i++) {
          stats.record(5000, 2000) // JSON 数据
        }

        const result = stats.getStats()

        expect(result.totalRequests).toBe(100)
        expect(result.compressedRequests).toBe(70)
        expect(result.compressionRate).toBe(0.7)
        expect(result.originalBytes).toBe(600000) // 50*10000 + 20*5000
        expect(result.compressedBytes).toBe(190000) // 50*3000 + 20*2000
      })
    })
  })

  describe('COMPRESSION_PRESETS', () => {
    it('应该包含 fastest 预设（级别1）', () => {
      expect(COMPRESSION_PRESETS.fastest).toEqual({ level: 1 })
    })

    it('应该包含 fast 预设（级别3）', () => {
      expect(COMPRESSION_PRESETS.fast).toEqual({ level: 3 })
    })

    it('应该包含 balanced 预设（级别6）', () => {
      expect(COMPRESSION_PRESETS.balanced).toEqual({ level: 6 })
    })

    it('应该包含 best 预设（级别9）', () => {
      expect(COMPRESSION_PRESETS.best).toEqual({ level: 9 })
    })

    it('应该有正确的级别顺序', () => {
      expect(COMPRESSION_PRESETS.fastest.level).toBeLessThan(COMPRESSION_PRESETS.fast.level)
      expect(COMPRESSION_PRESETS.fast.level).toBeLessThan(COMPRESSION_PRESETS.balanced.level)
      expect(COMPRESSION_PRESETS.balanced.level).toBeLessThan(COMPRESSION_PRESETS.best.level)
    })

    it('应该所有级别都在有效范围内 (1-9)', () => {
      const presets = Object.values(COMPRESSION_PRESETS)

      presets.forEach(preset => {
        expect(preset.level).toBeGreaterThanOrEqual(1)
        expect(preset.level).toBeLessThanOrEqual(9)
      })
    })
  })
})
