import { eq, and, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class MetadataService {
  private db = getDb()

  async getMetadata(userId: number, articleUrl: string) {
    const rows = await this.db.select()
      .from(schema.articleMetadata)
      .where(and(
        eq(schema.articleMetadata.userId, userId),
        eq(schema.articleMetadata.articleUrl, articleUrl),
      ))
      .limit(1)
    return rows[0] || null
  }

  async getMetadataByFakeid(userId: number, fakeid: string) {
    return this.db.select()
      .from(schema.articleMetadata)
      .where(and(
        eq(schema.articleMetadata.userId, userId),
        eq(schema.articleMetadata.fakeid, fakeid),
      ))
  }

  async getDownloadedUrls(userId: number, fakeid: string): Promise<string[]> {
    const rows = await this.db.select({ articleUrl: schema.articleMetadata.articleUrl })
      .from(schema.articleMetadata)
      .where(and(
        eq(schema.articleMetadata.userId, userId),
        eq(schema.articleMetadata.fakeid, fakeid),
      ))
    return rows.map(r => r.articleUrl)
  }

  async saveMetadata(userId: number, data: {
    fakeid: string
    articleUrl: string
    title: string
    readNum: number
    oldLikeNum: number
    shareNum: number
    likeNum: number
    commentNum: number
  }) {
    await this.db.insert(schema.articleMetadata).values({
      userId,
      ...data,
    }).onDuplicateKeyUpdate({
      set: {
        readNum: data.readNum,
        oldLikeNum: data.oldLikeNum,
        shareNum: data.shareNum,
        likeNum: data.likeNum,
        commentNum: data.commentNum,
      },
    })
  }

  async deleteByFakeid(userId: number, fakeid: string) {
    await this.db.delete(schema.articleMetadata)
      .where(and(
        eq(schema.articleMetadata.userId, userId),
        eq(schema.articleMetadata.fakeid, fakeid),
      ))
  }
}

let _metadataService: MetadataService | null = null
export function getMetadataService(): MetadataService {
  if (!_metadataService) _metadataService = new MetadataService()
  return _metadataService
}
