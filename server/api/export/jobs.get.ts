import { getExportService } from '~/server/services/export.service'

export default defineEventHandler(async (event) => {
  const userId = event.context.user!.userId
  const exportService = getExportService()
  const jobs = await exportService.getJobs(userId)

  return { success: true, data: jobs }
})
