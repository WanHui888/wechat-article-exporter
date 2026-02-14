import { eq, and, desc, sql, inArray, like, or, gte, lte } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'
import { getSearchService } from './search.service'

export class ArticleService {
  private db = getDb()

  async getArticles(userId: number, fakeid: string, options?: {
    page?: number
    pageSize?: number
    keyword?: string
    startTime?: number
    endTime?: number
    isFavorited?: boolean
  }) {
    const page = options?.page || 1
    const pageSize = options?.pageSize || 50
    const offset = (page - 1) * pageSize

    let conditions = [
      eq(schema.articles.userId, userId),
      eq(schema.articles.fakeid, fakeid),
    ]

    if (options?.keyword) {
      conditions.push(like(schema.articles.title, `%${options.keyword}%`))
    }
    if (options?.startTime) {
      conditions.push(gte(schema.articles.createTime, options.startTime))
    }
    if (options?.endTime) {
      conditions.push(lte(schema.articles.createTime, options.endTime))
    }
    if (options?.isFavorited !== undefined) {
      conditions.push(eq(schema.articles.isFavorited, options.isFavorited ? 1 : 0))
    }

    const where = and(...conditions)

    const [items, countResult] = await Promise.all([
      this.db.select()
        .from(schema.articles)
        .where(where)
        .orderBy(desc(schema.articles.createTime))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.articles)
        .where(where),
    ])

    const total = countResult[0]?.count || 0

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total,
    }
  }

  async getArticleByUrl(userId: number, url: string) {
    const rows = await this.db.select()
      .from(schema.articles)
      .where(and(
        eq(schema.articles.userId, userId),
        eq(schema.articles.link, url),
      ))
      .limit(1)
    return rows[0] || null
  }

  async getArticlesByFakeid(userId: number, fakeid: string) {
    return this.db.select()
      .from(schema.articles)
      .where(and(
        eq(schema.articles.userId, userId),
        eq(schema.articles.fakeid, fakeid),
      ))
      .orderBy(desc(schema.articles.createTime))
  }

  async getArticleCount(userId: number, fakeid: string) {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(schema.articles)
      .where(and(
        eq(schema.articles.userId, userId),
        eq(schema.articles.fakeid, fakeid),
      ))
    return result[0]?.count || 0
  }

  async upsertArticle(userId: number, data: {
    fakeid: string
    aid: string
    title: string
    link: string
    cover?: string
    digest?: string
    authorName?: string
    createTime?: number
    updateTime?: number
    appmsgid?: number
    itemidx?: number
    itemShowType?: number
    copyrightStat?: number
    copyrightType?: number
    isDeleted?: number
    isPaySubscribe?: number
    albumId?: string
    appmsgAlbumInfos?: any
    mediaDuration?: string
    isSingle?: number
  }) {
    try {
      const result = await this.db.insert(schema.articles).values({
        userId,
        fakeid: data.fakeid,
        aid: data.aid,
        title: data.title,
        link: data.link,
        cover: data.cover,
        digest: data.digest,
        authorName: data.authorName,
        createTime: data.createTime,
        updateTime: data.updateTime,
        appmsgid: data.appmsgid,
        itemidx: data.itemidx,
        itemShowType: data.itemShowType || 0,
        copyrightStat: data.copyrightStat,
        copyrightType: data.copyrightType,
        isDeleted: data.isDeleted || 0,
        isPaySubscribe: data.isPaySubscribe || 0,
        albumId: data.albumId,
        appmsgAlbumInfos: data.appmsgAlbumInfos,
        mediaDuration: data.mediaDuration,
        isSingle: data.isSingle || 0,
      }).onDuplicateKeyUpdate({
        set: {
          title: data.title,
          cover: data.cover,
          digest: data.digest,
          authorName: data.authorName,
          updateTime: data.updateTime,
          isDeleted: data.isDeleted || 0,
        },
      })

      // Index in MeiliSearch for full-text search
      const articleId = result[0].insertId
      if (articleId) {
        getSearchService().indexArticle({
          id: articleId,
          userId,
          fakeid: data.fakeid,
          title: data.title,
          link: data.link,
          cover: data.cover,
          digest: data.digest,
          authorName: data.authorName,
          createTime: data.createTime,
          isDeleted: data.isDeleted,
        }).catch(() => {})
      }
    } catch (e) {
      console.error('Failed to upsert article:', e)
    }
  }

  async upsertArticles(userId: number, articles: Array<Parameters<ArticleService['upsertArticle']>[1]>) {
    for (const article of articles) {
      await this.upsertArticle(userId, article)
    }
  }

  async setFavorite(userId: number, articleId: number, favorited: boolean) {
    await this.db.update(schema.articles)
      .set({ isFavorited: favorited ? 1 : 0 })
      .where(and(
        eq(schema.articles.userId, userId),
        eq(schema.articles.id, articleId),
      ))
  }

  async deleteArticlesByFakeid(userId: number, fakeid: string) {
    await this.db.delete(schema.articles)
      .where(and(
        eq(schema.articles.userId, userId),
        eq(schema.articles.fakeid, fakeid),
      ))

    // Remove from search index
    getSearchService().deleteByFakeid(userId, fakeid).catch(() => {})
  }

  async getAllArticleUrls(userId: number, fakeid: string): Promise<string[]> {
    const rows = await this.db.select({ link: schema.articles.link })
      .from(schema.articles)
      .where(and(
        eq(schema.articles.userId, userId),
        eq(schema.articles.fakeid, fakeid),
      ))
    return rows.map(r => r.link)
  }

  async getFavoritedArticles(userId: number, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize
    const where = and(
      eq(schema.articles.userId, userId),
      eq(schema.articles.isFavorited, 1),
    )

    const [items, countResult] = await Promise.all([
      this.db.select()
        .from(schema.articles)
        .where(where)
        .orderBy(desc(schema.articles.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.articles)
        .where(where),
    ])

    return {
      items,
      total: countResult[0]?.count || 0,
      page,
      pageSize,
      hasMore: offset + items.length < (countResult[0]?.count || 0),
    }
  }
}

let _articleService: ArticleService | null = null
export function getArticleService(): ArticleService {
  if (!_articleService) _articleService = new ArticleService()
  return _articleService
}
