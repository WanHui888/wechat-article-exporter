/**
 * 认证相关的 Schema 定义
 */

import { z } from 'zod'

/**
 * 登录 Schema
 */
export const loginSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名最多50个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和横杠'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(128, '密码最多128个字符'),
})

/**
 * 注册 Schema
 */
export const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名最多50个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和横杠'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(128, '密码最多128个字符'),
  email: z.string()
    .email('邮箱格式不正确')
    .max(255, '邮箱最多255个字符')
    .optional(),
  nickname: z.string()
    .max(50, '昵称最多50个字符')
    .optional(),
})

/**
 * 更新资料 Schema
 */
export const updateProfileSchema = z.object({
  nickname: z.string()
    .max(50, '昵称最多50个字符')
    .optional(),
  email: z.string()
    .email('邮箱格式不正确')
    .max(255, '邮箱最多255个字符')
    .optional(),
  avatar: z.string()
    .url('头像必须是有效的 URL')
    .max(500, '头像 URL 最多500个字符')
    .optional(),
})

/**
 * 修改密码 Schema
 */
export const changePasswordSchema = z.object({
  oldPassword: z.string()
    .min(1, '请输入旧密码'),
  newPassword: z.string()
    .min(6, '新密码至少6个字符')
    .max(128, '新密码最多128个字符'),
})
