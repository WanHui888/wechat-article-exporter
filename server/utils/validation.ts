/**
 * 通用输入验证工具
 *
 * 使用 Zod 进行 Schema 验证，统一错误处理
 */

import { z, type ZodSchema } from 'zod'

/**
 * 验证请求体
 * @param event - H3 事件
 * @param schema - Zod Schema
 * @returns 验证后的数据
 * @throws 验证失败时抛出 400 错误
 */
export async function validateBody<T>(
  event: H3Event,
  schema: ZodSchema<T>,
): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '请求参数验证失败',
      data: {
        errors: result.error.flatten().fieldErrors,
        message: Object.values(result.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      },
    })
  }

  return result.data
}

/**
 * 验证查询参数
 * @param event - H3 事件
 * @param schema - Zod Schema
 * @returns 验证后的数据
 * @throws 验证失败时抛出 400 错误
 */
export async function validateQuery<T>(
  event: H3Event,
  schema: ZodSchema<T>,
): Promise<T> {
  const query = getQuery(event)
  const result = schema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '查询参数验证失败',
      data: {
        errors: result.error.flatten().fieldErrors,
        message: Object.values(result.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      },
    })
  }

  return result.data
}

/**
 * 验证路由参数
 * @param event - H3 事件
 * @param schema - Zod Schema
 * @returns 验证后的数据
 * @throws 验证失败时抛出 400 错误
 */
export function validateParams<T>(
  event: H3Event,
  schema: ZodSchema<T>,
): T {
  const params = getRouterParams(event)
  const result = schema.safeParse(params)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '路由参数验证失败',
      data: {
        errors: result.error.flatten().fieldErrors,
        message: Object.values(result.error.flatten().fieldErrors)
          .flat()
          .join(', '),
      },
    })
  }

  return result.data
}
