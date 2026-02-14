import { createReadStream } from 'fs'
import { getExportService } from '~/server/services/export.service'
import { getFileService } from '~/server/services/file.service'

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

  if (job.status !== 'completed' || !job.filePath) {
    throw createError({ statusCode: 400, statusMessage: '文件未就绪' })
  }

  // Check if expired
  if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: '下载链接已过期' })
  }

  const fileService = getFileService()
  const exists = await fileService.fileExists(job.filePath)
  if (!exists) {
    throw createError({ statusCode: 404, statusMessage: '文件不存在' })
  }

  const fileName = `export_${id}.zip`

  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)
  if (job.fileSize) {
    setHeader(event, 'Content-Length', String(job.fileSize))
  }

  return sendStream(event, createReadStream(job.filePath))
})
