/**
 * 账户相关的 Schema 定义
 */

import { z } from 'zod'

/**
 * 导入账户项 Schema
 */
const accountItemSchema = z.object({
  fakeid: z.string().min(1, 'fakeid 不能为空'),
  nickname: z.string().optional(),
  alias: z.string().optional(),
  round_head_img: z.string().url().optional(),
  service_type: z.number().int().optional(),
})

/**
 * 导入账户 Schema
 */
export const importAccountsSchema = z.object({
  accounts: z.array(accountItemSchema)
    .min(1, '至少导入一个账户')
    .max(1000, '单次最多导入1000个账户'),
})

/**
 * 同步账户 Schema
 */
export const syncAccountSchema = z.object({
  fakeid: z.string().min(1, 'fakeid 不能为空'),
  force: z.boolean().optional(),
})

/**
 * 查询账户 Schema
 */
export const getAccountsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
})

/**
 * 删除账户 Schema
 */
export const deleteAccountSchema = z.object({
  fakeid: z.string().min(1, 'fakeid 不能为空'),
})
