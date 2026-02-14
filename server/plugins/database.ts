import { initDatabase, runMigrations } from '~/server/database'
import { getAuthService } from '~/server/services/auth.service'
import { getSchedulerService } from '~/server/services/scheduler.service'
import { getSearchService } from '~/server/services/search.service'

export default defineNitroPlugin(async () => {
  console.log('[Server] Initializing database...')

  try {
    // Initialize database connection
    initDatabase()

    // Run migrations
    await runMigrations()

    // Create admin user if not exists
    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

    try {
      const authService = getAuthService()
      const existingAdmin = await authService.getUserByUsername(adminUsername)
      if (!existingAdmin) {
        await authService.createUser(adminUsername, adminPassword, {
          role: 'admin',
          nickname: '管理员',
          storageQuota: 50 * 1024 * 1024 * 1024, // 50 GB
        })
        console.log(`[Server] Admin user '${adminUsername}' created`)
      }
    } catch (e) {
      console.log('[Server] Admin user already exists or creation skipped')
    }

    // Start the task scheduler
    try {
      const scheduler = getSchedulerService()
      scheduler.start()
    } catch (e) {
      console.warn('[Server] Scheduler initialization failed:', e)
    }

    // Initialize MeiliSearch index
    try {
      const searchService = getSearchService()
      await searchService.ensureIndex()
    } catch (e) {
      console.warn('[Server] MeiliSearch initialization skipped:', e)
    }

    console.log('[Server] Database initialized successfully')
  } catch (error) {
    console.error('[Server] Database initialization failed:', error)
    console.warn('[Server] App will run without database. Install and configure MySQL to enable full functionality.')
  }
})
