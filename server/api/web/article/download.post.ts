import { getDownloadService } from '~/server/services/download.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.userId
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { articleUrl, fakeid } = body

  if (!articleUrl || !fakeid) {
    throw createError({ statusCode: 400, statusMessage: 'articleUrl and fakeid are required' })
  }

  const service = getDownloadService()

  try {
    const result = await service.downloadArticle(userId, fakeid, articleUrl)
    return { success: true, data: result }
  } catch (e: any) {
    if (e.message === 'wechat_expired') {
      return { success: false, error: 'wechat_expired' }
    }
    if (e.message === 'storage_quota_exceeded') {
      throw createError({ statusCode: 413, statusMessage: '存储空间不足' })
    }
    throw createError({ statusCode: 500, statusMessage: e.message || '下载失败' })
  }
})
