import { getExportService } from '~/server/services/export.service'
import { validateBody } from '~/server/utils/validation'
import { createExportSchema } from '~/server/schemas/export.schema'

export default defineEventHandler(async (event) => {
  const userId = event.context.user!.userId
  const { format, articleUrls } = await validateBody(event, createExportSchema)

  const exportService = getExportService()
  const result = await exportService.createJob(userId, format, articleUrls)

  return { success: true, data: result }
})
