import { getExportService } from '~/server/services/export.service'
import type { ExportFormat } from '~/types'

export default defineEventHandler(async (event) => {
  const userId = event.context.user!.userId
  const body = await readBody(event)

  const { format, articleUrls, fakeid } = body as {
    format: ExportFormat
    articleUrls: string[]
    fakeid?: string
  }

  if (!format || !articleUrls?.length) {
    throw createError({ statusCode: 400, statusMessage: '请指定导出格式和文章' })
  }

  const validFormats: ExportFormat[] = ['html', 'excel', 'json', 'txt', 'markdown', 'word']
  if (!validFormats.includes(format)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的导出格式' })
  }

  const exportService = getExportService()
  const result = await exportService.createJob(userId, format, articleUrls, fakeid)

  return { success: true, data: result }
})
