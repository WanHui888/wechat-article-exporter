import { eq, and, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class CommentService {
  private db = getDb()

  async getComment(userId: number, articleUrl: string) {
    const rows = await this.db.select()
      .from(schema.articleComments)
      .where(and(
        eq(schema.articleComments.userId, userId),
        eq(schema.articleComments.articleUrl, articleUrl),
      ))
      .limit(1)
    return rows[0] || null
  }

  async getCommentsByFakeid(userId: number, fakeid: string) {
    return this.db.select()
      .from(schema.articleComments)
      .where(and(
        eq(schema.articleComments.userId, userId),
        eq(schema.articleComments.fakeid, fakeid),
      ))
  }

  async getDownloadedUrls(userId: number, fakeid: string): Promise<string[]> {
    const rows = await this.db.select({ articleUrl: schema.articleComments.articleUrl })
      .from(schema.articleComments)
      .where(and(
        eq(schema.articleComments.userId, userId),
        eq(schema.articleComments.fakeid, fakeid),
      ))
    return rows.map(r => r.articleUrl)
  }

  async saveComment(userId: number, data: {
    fakeid: string
    articleUrl: string
    title: string
    data: any
  }) {
    await this.db.insert(schema.articleComments).values({
      userId,
      fakeid: data.fakeid,
      articleUrl: data.articleUrl,
      title: data.title,
      data: data.data,
    }).onDuplicateKeyUpdate({
      set: {
        data: data.data,
      },
    })
  }

  async saveCommentReply(userId: number, data: {
    fakeid: string
    articleUrl: string
    title: string
    contentId: string
    data: any
  }) {
    await this.db.insert(schema.articleCommentReplies).values({
      userId,
      fakeid: data.fakeid,
      articleUrl: data.articleUrl,
      title: data.title,
      contentId: data.contentId,
      data: data.data,
    }).onDuplicateKeyUpdate({
      set: {
        data: data.data,
      },
    })
  }

  async getCommentReplies(userId: number, articleUrl: string) {
    return this.db.select()
      .from(schema.articleCommentReplies)
      .where(and(
        eq(schema.articleCommentReplies.userId, userId),
        eq(schema.articleCommentReplies.articleUrl, articleUrl),
      ))
  }

  async deleteByFakeid(userId: number, fakeid: string) {
    await Promise.all([
      this.db.delete(schema.articleComments)
        .where(and(
          eq(schema.articleComments.userId, userId),
          eq(schema.articleComments.fakeid, fakeid),
        )),
      this.db.delete(schema.articleCommentReplies)
        .where(and(
          eq(schema.articleCommentReplies.userId, userId),
          eq(schema.articleCommentReplies.fakeid, fakeid),
        )),
    ])
  }
}

let _commentService: CommentService | null = null
export function getCommentService(): CommentService {
  if (!_commentService) _commentService = new CommentService()
  return _commentService
}
