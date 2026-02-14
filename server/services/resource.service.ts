import { eq, and, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class ResourceService {
  private db = getDb()

  async getResource(userId: number, resourceUrl: string) {
    const rows = await this.db.select()
      .from(schema.resources)
      .where(and(
        eq(schema.resources.userId, userId),
        eq(schema.resources.resourceUrl, resourceUrl),
      ))
      .limit(1)
    return rows[0] || null
  }

  async saveResource(userId: number, data: {
    fakeid: string
    resourceUrl: string
    filePath: string
    fileSize: number
    mimeType?: string
  }) {
    await this.db.insert(schema.resources).values({
      userId,
      ...data,
    }).onDuplicateKeyUpdate({
      set: {
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    })
  }

  async getResourceMap(userId: number, articleUrl: string) {
    const rows = await this.db.select()
      .from(schema.resourceMaps)
      .where(and(
        eq(schema.resourceMaps.userId, userId),
        eq(schema.resourceMaps.articleUrl, articleUrl),
      ))
      .limit(1)
    return rows[0] || null
  }

  async saveResourceMap(userId: number, data: {
    fakeid: string
    articleUrl: string
    resources: Record<string, string>
  }) {
    await this.db.insert(schema.resourceMaps).values({
      userId,
      fakeid: data.fakeid,
      articleUrl: data.articleUrl,
      resources: data.resources,
    }).onDuplicateKeyUpdate({
      set: {
        resources: data.resources,
      },
    })
  }

  async deleteByFakeid(userId: number, fakeid: string) {
    await Promise.all([
      this.db.delete(schema.resources)
        .where(and(
          eq(schema.resources.userId, userId),
          eq(schema.resources.fakeid, fakeid),
        )),
      this.db.delete(schema.resourceMaps)
        .where(and(
          eq(schema.resourceMaps.userId, userId),
          eq(schema.resourceMaps.fakeid, fakeid),
        )),
    ])
  }

  async getTotalSize(userId: number): Promise<number> {
    const result = await this.db.select({
      total: sql<number>`COALESCE(SUM(file_size), 0)`,
    })
      .from(schema.resources)
      .where(eq(schema.resources.userId, userId))
    return result[0]?.total || 0
  }
}

let _resourceService: ResourceService | null = null
export function getResourceService(): ResourceService {
  if (!_resourceService) _resourceService = new ResourceService()
  return _resourceService
}
