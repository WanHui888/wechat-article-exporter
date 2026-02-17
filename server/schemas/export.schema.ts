/**
 * 导出相关的 Schema 定义
 */

import { z } from 'zod'

/**
 * 导出格式枚举
 */
export const exportFormatSchema = z.enum(['html', 'excel', 'json', 'txt', 'markdown', 'word'], {
  errorMap: () => ({ message: '不支持的导出格式' }),
})

/**
 * 创建导出任务 Schema
 */
export const createExportSchema = z.object({
  format: exportFormatSchema,
  articleUrls: z.array(z.string().url('文章 URL 格式不正确'))
    .min(1, '至少选择一篇文章')
    .max(1000, '单次最多导出1000篇文章'),
  options: z.object({
    includeImages: z.boolean().optional(),
    includeComments: z.boolean().optional(),
    compression: z.boolean().optional(),
  }).optional(),
})

/**
 * 查询导出任务 Schema
 */
export const getExportJobsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
})

/**
 * 删除导出任务 Schema
 */
export const deleteExportJobSchema = z.object({
  id: z.coerce.number().int().positive('任务 ID 必须是正整数'),
})
