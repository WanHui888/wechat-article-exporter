import { getSchedulerService } from '~/server/services/scheduler.service'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '无权限' })
  }

  const { taskId } = await readBody(event)

  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: '缺少 taskId 参数' })
  }

  try {
    const scheduler = getSchedulerService()
    // Execute async to avoid blocking the response
    scheduler.triggerTask(taskId).catch(err => {
      console.error(`[Admin] Task ${taskId} execution failed:`, err.message)
    })

    return { success: true, message: '任务已触发' }
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: e.message || '触发失败' })
  }
})
