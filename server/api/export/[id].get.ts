import { getExportService } from '~/server/services/export.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.user!.userId
  const id = Number(event.context.params!.id)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '无效的任务ID' })
  }

  const exportService = getExportService()
  const job = await exportService.getJob(userId, id)

  if (!job) {
    throw createError({ statusCode: 404, statusMessage: '任务不存在' })
  }

  return { success: true, data: job }
})
