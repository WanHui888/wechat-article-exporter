import { eq, and, sql, lte } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'
import { getExportService } from './export.service'
import { getLogService } from './log.service'

export class SchedulerService {
  private db = getDb()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private running = false

  /**
   * Start the scheduler loop, checking for due tasks every 60 seconds
   */
  start() {
    if (this.intervalId) return
    console.log('[Scheduler] Starting task scheduler (interval: 60s)')
    this.intervalId = setInterval(() => this.tick(), 60 * 1000)
    // Run once immediately
    this.tick()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[Scheduler] Stopped')
    }
  }

  /**
   * Check for due tasks and execute them
   */
  private async tick() {
    if (this.running) return
    this.running = true

    try {
      const dueTasks = await this.db.select()
        .from(schema.scheduledTasks)
        .where(and(
          eq(schema.scheduledTasks.enabled, 1),
          eq(schema.scheduledTasks.status, 'idle'),
          lte(schema.scheduledTasks.nextRunAt, new Date()),
        ))

      for (const task of dueTasks) {
        await this.executeTask(task.id, task.userId, task.type, task.targetFakeid, task.intervalHours, task.config)
      }
    } catch (error: any) {
      console.error('[Scheduler] Tick error:', error.message)
    } finally {
      this.running = false
    }
  }

  /**
   * Execute a single task by ID
   */
  async executeTask(
    taskId: number,
    userId: number,
    type: string,
    targetFakeid: string | null,
    intervalHours: number,
    config: any,
  ) {
    console.log(`[Scheduler] Executing task #${taskId} (type: ${type})`)

    // Mark as running
    await this.db.update(schema.scheduledTasks)
      .set({ status: 'running', lastError: null })
      .where(eq(schema.scheduledTasks.id, taskId))

    try {
      switch (type) {
        case 'cleanup':
          await this.runCleanup(userId, config)
          break
        case 'sync':
          await this.runSync(userId, targetFakeid, config)
          break
        case 'download':
          await this.runDownload(userId, targetFakeid, config)
          break
        default:
          throw new Error(`Unknown task type: ${type}`)
      }

      // Mark as completed, schedule next run
      const nextRunAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000)
      await this.db.update(schema.scheduledTasks)
        .set({
          status: 'idle',
          lastRunAt: new Date(),
          nextRunAt,
          lastError: null,
        })
        .where(eq(schema.scheduledTasks.id, taskId))

      // Log success
      const logService = getLogService()
      await logService.log(userId, 'task_run', {
        targetType: 'scheduled_task',
        targetId: String(taskId),
        detail: { type, targetFakeid },
        status: 'success',
      })

      console.log(`[Scheduler] Task #${taskId} completed, next run at ${nextRunAt.toISOString()}`)
    } catch (error: any) {
      console.error(`[Scheduler] Task #${taskId} failed:`, error.message)

      // Mark as error
      await this.db.update(schema.scheduledTasks)
        .set({
          status: 'error',
          lastRunAt: new Date(),
          lastError: error.message || 'Unknown error',
        })
        .where(eq(schema.scheduledTasks.id, taskId))

      // Log failure
      const logService = getLogService()
      await logService.log(userId, 'task_run', {
        targetType: 'scheduled_task',
        targetId: String(taskId),
        detail: { type, error: error.message },
        status: 'failed',
      })
    }
  }

  /**
   * Manually trigger a task (from admin UI)
   */
  async triggerTask(taskId: number) {
    const tasks = await this.db.select()
      .from(schema.scheduledTasks)
      .where(eq(schema.scheduledTasks.id, taskId))
      .limit(1)

    const task = tasks[0]
    if (!task) throw new Error('Task not found')
    if (task.status === 'running') throw new Error('Task is already running')

    await this.executeTask(task.id, task.userId, task.type, task.targetFakeid, task.intervalHours, task.config)
  }

  /**
   * Cleanup task: remove expired exports and old logs
   */
  private async runCleanup(userId: number, config: any) {
    const logRetentionDays = config?.logRetentionDays || 90

    // Clean expired export jobs
    const exportService = getExportService()
    await exportService.cleanExpiredJobs()
    console.log('[Scheduler] Cleaned expired export jobs')

    // Clean old operation logs
    const logService = getLogService()
    await logService.cleanOldLogs(logRetentionDays)
    console.log(`[Scheduler] Cleaned logs older than ${logRetentionDays} days`)

    // Recalculate storage for the user
    const { getFileService } = await import('./file.service')
    const fileService = getFileService()
    await fileService.recalculateStorage(userId)
    console.log('[Scheduler] Recalculated storage usage')
  }

  /**
   * Sync task: sync articles for accounts that have auto-sync enabled.
   * Note: This requires a valid WeChat session. If no session is available,
   * the task will be skipped with a warning.
   */
  private async runSync(userId: number, targetFakeid: string | null, _config: any) {
    // Check for valid WeChat session
    const sessions = await this.db.select()
      .from(schema.wechatSessions)
      .where(and(
        eq(schema.wechatSessions.userId, userId),
        sql`expires_at > NOW()`,
      ))
      .limit(1)

    if (sessions.length === 0) {
      throw new Error('No valid WeChat session found. Please login to WeChat first.')
    }

    const session = sessions[0]!

    // Get accounts to sync
    const { getAccountService } = await import('./account.service')
    const accountService = getAccountService()

    let accounts
    if (targetFakeid) {
      const account = await accountService.getAccount(userId, targetFakeid)
      accounts = account ? [account] : []
    } else {
      accounts = await accountService.getAutoSyncAccounts()
      // Filter to only this user's accounts
      accounts = accounts.filter(a => a.userId === userId)
    }

    if (accounts.length === 0) {
      console.log('[Scheduler] No accounts to sync')
      return
    }

    // Perform sync for each account using stored session
    for (const account of accounts) {
      try {
        console.log(`[Scheduler] Syncing account: ${account.nickname} (${account.fakeid})`)

        // Use the WeChat API to fetch article list
        const cookies = session.cookies as any[]
        const cookieStr = Array.isArray(cookies)
          ? cookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
          : ''

        let begin = 0
        const count = 5
        let hasMore = true
        let syncedCount = 0

        while (hasMore) {
          const response = await fetch(
            `https://mp.weixin.qq.com/cgi-bin/appmsgpublish?sub=list&search_field=null&begin=${begin}&count=${count}&query=&fakeid=${account.fakeid}&type=101_1&free_publish_type=1&sub_action=list_ex&token=${session.token}&lang=zh_CN&f=json&ajax=1`,
            {
              headers: {
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            },
          )

          if (!response.ok) {
            throw new Error(`WeChat API returned ${response.status}`)
          }

          const data = await response.json() as any

          if (data.base_resp?.ret !== 0) {
            throw new Error(`WeChat API error: ${data.base_resp?.err_msg || 'Unknown error'}`)
          }

          const publishPage = JSON.parse(data.publish_page || '{}')
          const publishList = publishPage.publish_list || []

          if (publishList.length === 0) {
            hasMore = false
            break
          }

          // Parse and save articles
          const { getArticleService } = await import('./article.service')
          const articleService = getArticleService()

          for (const pub of publishList) {
            const info = JSON.parse(pub.publish_info || '{}')
            const appmsgex = info.appmsgex || []

            for (const article of appmsgex) {
              await articleService.upsertArticle(userId, {
                fakeid: account.fakeid,
                aid: String(article.aid || article.itemidx || syncedCount),
                title: article.title || '',
                link: article.link || '',
                cover: article.cover || '',
                digest: article.digest || '',
                authorName: article.author_name || '',
                createTime: article.create_time,
                updateTime: article.update_time,
                appmsgid: article.appmsgid,
                itemidx: article.itemidx,
                itemShowType: article.item_show_type || 0,
                copyrightStat: article.copyright_stat,
                copyrightType: article.copyright_type,
                isDeleted: article.is_deleted ? 1 : 0,
                isPaySubscribe: article.is_pay_subscribe || 0,
              })
              syncedCount++
            }
          }

          // Update account sync progress
          await accountService.updateSyncProgress(userId, account.fakeid, {
            syncedCount: syncedCount,
            lastSyncAt: new Date(),
          })

          begin += count
          hasMore = publishList.length >= count

          // Rate limiting delay
          await new Promise(r => setTimeout(r, 2000))
        }

        console.log(`[Scheduler] Synced ${syncedCount} articles for ${account.nickname}`)
      } catch (e: any) {
        console.error(`[Scheduler] Failed to sync ${account.nickname}:`, e.message)
      }
    }
  }

  /**
   * Download task: download HTML content for articles that haven't been downloaded yet.
   * Requires proxy configuration.
   */
  private async runDownload(userId: number, targetFakeid: string | null, config: any) {
    const { getArticleService } = await import('./article.service')
    const { getHtmlService } = await import('./html.service')

    const articleService = getArticleService()
    const htmlService = getHtmlService()

    // Get articles for the target account
    let urls: string[] = []
    if (targetFakeid) {
      const allUrls = await articleService.getArticleUrls(userId, targetFakeid)
      const downloadedUrls = await htmlService.getDownloadedUrls(userId, targetFakeid)
      const downloadedSet = new Set(downloadedUrls)
      urls = allUrls.filter(u => !downloadedSet.has(u))
    }

    if (urls.length === 0) {
      console.log('[Scheduler] No articles to download')
      return
    }

    const maxDownloads = config?.maxPerRun || 50
    const downloadUrls = urls.slice(0, maxDownloads)
    const proxyUrl = config?.proxyUrl || ''

    console.log(`[Scheduler] Downloading ${downloadUrls.length} articles`)

    const { getFileService } = await import('./file.service')
    const fileService = getFileService()

    let downloaded = 0
    for (const url of downloadUrls) {
      try {
        const fetchUrl = proxyUrl ? `${proxyUrl}/${url}` : url
        const response = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        if (!response.ok) continue

        const htmlContent = await response.text()

        // Extract title
        const titleMatch = htmlContent.match(/<title>([^<]*)<\/title>/i)
        const title = titleMatch?.[1] || 'Untitled'

        // Extract comment_id
        const commentIdMatch = htmlContent.match(/var\s+comment_id\s*=\s*"([^"]+)"/)
        const commentId = commentIdMatch?.[1]

        // Save HTML file
        const uploadDir = fileService.getUploadPath(userId, targetFakeid || 'unknown', 'html')
        const safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 80)
        const filePath = `${uploadDir}/${safeTitle}_${Date.now()}.html`

        const fileSize = await fileService.saveFile(filePath, htmlContent)

        await htmlService.saveHtml(userId, {
          fakeid: targetFakeid || 'unknown',
          articleUrl: url,
          title,
          commentId,
          filePath,
          fileSize,
        })

        await fileService.updateStorageUsed(userId, fileSize)
        downloaded++
      } catch (e: any) {
        console.error(`[Scheduler] Failed to download ${url}:`, e.message)
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 1000))
    }

    console.log(`[Scheduler] Downloaded ${downloaded}/${downloadUrls.length} articles`)
  }
}

let _schedulerService: SchedulerService | null = null
export function getSchedulerService(): SchedulerService {
  if (!_schedulerService) _schedulerService = new SchedulerService()
  return _schedulerService
}
