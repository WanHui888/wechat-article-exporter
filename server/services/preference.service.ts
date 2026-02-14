import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'
import type { UserPreferencesData } from '~/types'

const DEFAULT_PREFERENCES: UserPreferencesData = {
  theme: 'system',
  downloadConcurrency: 3,
  autoDownload: false,
  exportFormat: 'html',
  syncInterval: 24,
  notificationsEnabled: true,
  hideDeleted: true,
  exportConfig: {
    dirname: '${account}/${YYYY}-${MM}-${DD}_${title}',
    maxlength: 80,
    exportJsonIncludeContent: false,
    exportJsonIncludeComments: false,
    exportExcelIncludeContent: false,
    exportHtmlIncludeComments: true,
  },
}

export class PreferenceService {
  private db = getDb()

  async getPreferences(userId: number): Promise<UserPreferencesData> {
    const rows = await this.db.select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId))
      .limit(1)

    if (!rows[0]) {
      return { ...DEFAULT_PREFERENCES }
    }

    return { ...DEFAULT_PREFERENCES, ...(rows[0].preferences as UserPreferencesData) }
  }

  async updatePreferences(userId: number, preferences: Partial<UserPreferencesData>): Promise<UserPreferencesData> {
    const current = await this.getPreferences(userId)
    const merged = { ...current, ...preferences }

    await this.db.insert(schema.userPreferences).values({
      userId,
      preferences: merged,
    }).onDuplicateKeyUpdate({
      set: {
        preferences: merged,
      },
    })

    return merged
  }
}

let _preferenceService: PreferenceService | null = null
export function getPreferenceService(): PreferenceService {
  if (!_preferenceService) _preferenceService = new PreferenceService()
  return _preferenceService
}
