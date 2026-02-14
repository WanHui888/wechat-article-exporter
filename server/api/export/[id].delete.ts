import { getExportService } from '~/server/services/export.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.user!.userId
  const id = Number(event.context.params!.id)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '无效的任务ID' })
  }

  const exportService = getExportService()
  await exportService.deleteJob(userId, id)

  return { success: true, data: null }
})
