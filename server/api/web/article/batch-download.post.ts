import { getDownloadService } from '~/server/services/download.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { articleUrls, fakeid, concurrency } = body

  if (!articleUrls || !Array.isArray(articleUrls) || articleUrls.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'articleUrls must be a non-empty array' })
  }
  if (!fakeid) {
    throw createError({ statusCode: 400, statusMessage: 'fakeid is required' })
  }
  if (articleUrls.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum 500 URLs per batch' })
  }

  const service = getDownloadService()
  const effectiveConcurrency = Math.min(Math.max(1, concurrency || 2), 3)

  try {
    const result = await service.batchDownload(userId, fakeid, articleUrls, effectiveConcurrency)
    return { success: true, data: result }
  } catch (e: any) {
    if (e.message === 'storage_quota_exceeded') {
      throw createError({ statusCode: 413, statusMessage: '存储空间不足' })
    }
    throw createError({ statusCode: 500, statusMessage: e.message || '批量下载失败' })
  }
})
