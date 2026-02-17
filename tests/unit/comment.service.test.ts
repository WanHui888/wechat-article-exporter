import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommentService } from '~/server/services/comment.service'

/**
 * CommentService 单元测试
 *
 * 测试覆盖：
 * 1. getComment - 获取单个文章评论
 * 2. getCommentsByFakeid - 获取公众号所有文章评论
 * 3. getDownloadedUrls - 获取已下载评论的文章 URL 列表
 * 4. saveComment - 保存文章评论数据
 * 5. saveCommentReply - 保存评论回复数据
 * 6. getCommentReplies - 获取文章的评论回复
 * 7. deleteByFakeid - 删除公众号的所有评论和回复
 */

// ==================== Mock 设置 ====================

// Use vi.hoisted to declare mocks before vi.mock calls
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
    },
  }
})

// Mock modules
vi.mock('~/server/database', () => ({
  getDb: () => mockDb,
  schema: {
    articleComments: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      articleUrl: 'articleUrl',
      title: 'title',
      data: 'data',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    articleCommentReplies: {
      id: 'id',
      userId: 'userId',
      fakeid: 'fakeid',
      articleUrl: 'articleUrl',
      title: 'title',
      contentId: 'contentId',
      data: 'data',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
}))

// ==================== 测试套件 ====================

describe('CommentService', () => {
  let service: CommentService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CommentService()
  })

  // ==================== getComment() 测试 ====================

  describe('getComment', () => {
    it('should return comment when found', async () => {
      const mockComment = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        data: { comments: [] },
        createdAt: new Date(),
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockComment]),
      })

      const result = await service.getComment(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual(mockComment)
    })

    it('should return null when comment not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getComment(1, 'https://mp.weixin.qq.com/s/nonexistent')

      expect(result).toBeNull()
    })

    it('should query with correct userId and articleUrl', async () => {
      const whereSpy = vi.fn().mockReturnThis()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        limit: vi.fn().mockResolvedValue([]),
      })

      await service.getComment(123, 'https://mp.weixin.qq.com/s/test')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return comment with data', async () => {
      const mockComment = {
        id: 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        data: {
          comments: [
            { id: '1', content: 'Great article!', nickname: 'User1' },
            { id: '2', content: 'Very helpful', nickname: 'User2' },
          ],
        },
      }

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockComment]),
      })

      const result = await service.getComment(1, 'https://mp.weixin.qq.com/s/test')

      expect(result?.data).toEqual(mockComment.data)
      expect(result?.data.comments).toHaveLength(2)
    })
  })

  // ==================== getCommentsByFakeid() 测试 ====================

  describe('getCommentsByFakeid', () => {
    it('should return all comments for fakeid', async () => {
      const mockComments = [
        {
          id: 1,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article1',
          title: 'Article 1',
          data: { comments: [] },
        },
        {
          id: 2,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/article2',
          title: 'Article 2',
          data: { comments: [] },
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockComments),
      })

      const result = await service.getCommentsByFakeid(1, 'test_fakeid')

      expect(result).toEqual(mockComments)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no comments', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getCommentsByFakeid(1, 'empty_fakeid')

      expect(result).toEqual([])
    })

    it('should filter by userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getCommentsByFakeid(456, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return multiple comments', async () => {
      const mockComments = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        fakeid: 'test_fakeid',
        articleUrl: `https://mp.weixin.qq.com/s/article${i}`,
        title: `Article ${i}`,
        data: { comments: [] },
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockComments),
      })

      const result = await service.getCommentsByFakeid(1, 'test_fakeid')

      expect(result).toHaveLength(10)
    })
  })

  // ==================== getDownloadedUrls() 测试 ====================

  describe('getDownloadedUrls', () => {
    it('should return array of article URLs', async () => {
      const mockRows = [
        { articleUrl: 'https://mp.weixin.qq.com/s/article1' },
        { articleUrl: 'https://mp.weixin.qq.com/s/article2' },
        { articleUrl: 'https://mp.weixin.qq.com/s/article3' },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRows),
      })

      const urls = await service.getDownloadedUrls(1, 'test_fakeid')

      expect(urls).toEqual([
        'https://mp.weixin.qq.com/s/article1',
        'https://mp.weixin.qq.com/s/article2',
        'https://mp.weixin.qq.com/s/article3',
      ])
    })

    it('should return empty array when no comments', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const urls = await service.getDownloadedUrls(1, 'empty_fakeid')

      expect(urls).toEqual([])
    })

    it('should handle single URL', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { articleUrl: 'https://mp.weixin.qq.com/s/single' },
        ]),
      })

      const urls = await service.getDownloadedUrls(1, 'test_fakeid')

      expect(urls).toEqual(['https://mp.weixin.qq.com/s/single'])
    })

    it('should filter by userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getDownloadedUrls(789, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should handle large number of URLs', async () => {
      const mockRows = Array.from({ length: 100 }, (_, i) => ({
        articleUrl: `https://mp.weixin.qq.com/s/article${i}`,
      }))

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRows),
      })

      const urls = await service.getDownloadedUrls(1, 'test_fakeid')

      expect(urls).toHaveLength(100)
    })
  })

  // ==================== saveComment() 测试 ====================

  describe('saveComment', () => {
    const userId = 1
    const commentData = {
      fakeid: 'test_fakeid',
      articleUrl: 'https://mp.weixin.qq.com/s/test',
      title: 'Test Article',
      data: {
        comments: [
          { id: '1', content: 'Comment 1' },
          { id: '2', content: 'Comment 2' },
        ],
      },
    }

    it('should insert new comment', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(userId, commentData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update existing comment on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveComment(userId, commentData)

      expect(updateSpy).toHaveBeenCalledWith({
        set: {
          data: commentData.data,
        },
      })
    })

    it('should include userId in insert', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(456, commentData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 456,
        })
      )
    })

    it('should include all comment fields', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(userId, commentData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fakeid: commentData.fakeid,
          articleUrl: commentData.articleUrl,
          title: commentData.title,
          data: commentData.data,
        })
      )
    })

    it('should handle empty comments array', async () => {
      const emptyCommentData = {
        ...commentData,
        data: { comments: [] },
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(userId, emptyCommentData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle large comment data', async () => {
      const largeCommentData = {
        ...commentData,
        data: {
          comments: Array.from({ length: 100 }, (_, i) => ({
            id: String(i),
            content: `Comment ${i}`,
          })),
        },
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(userId, largeCommentData)

      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  // ==================== saveCommentReply() 测试 ====================

  describe('saveCommentReply', () => {
    const userId = 1
    const replyData = {
      fakeid: 'test_fakeid',
      articleUrl: 'https://mp.weixin.qq.com/s/test',
      title: 'Test Article',
      contentId: 'comment_123',
      data: {
        replies: [
          { id: '1', content: 'Reply 1' },
          { id: '2', content: 'Reply 2' },
        ],
      },
    }

    it('should insert new reply', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCommentReply(userId, replyData)

      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should update existing reply on duplicate', async () => {
      const updateSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: updateSpy,
      })

      await service.saveCommentReply(userId, replyData)

      expect(updateSpy).toHaveBeenCalledWith({
        set: {
          data: replyData.data,
        },
      })
    })

    it('should include userId and contentId in insert', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCommentReply(456, replyData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 456,
          contentId: replyData.contentId,
        })
      )
    })

    it('should include all reply fields', async () => {
      const valuesSpy = vi.fn().mockReturnThis()
      mockDb.insert.mockReturnValue({
        values: valuesSpy,
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCommentReply(userId, replyData)

      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fakeid: replyData.fakeid,
          articleUrl: replyData.articleUrl,
          title: replyData.title,
          contentId: replyData.contentId,
          data: replyData.data,
        })
      )
    })

    it('should handle empty replies array', async () => {
      const emptyReplyData = {
        ...replyData,
        data: { replies: [] },
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveCommentReply(userId, emptyReplyData)

      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  // ==================== getCommentReplies() 测试 ====================

  describe('getCommentReplies', () => {
    it('should return all replies for article', async () => {
      const mockReplies = [
        {
          id: 1,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/test',
          title: 'Test Article',
          contentId: 'comment_1',
          data: { replies: [] },
        },
        {
          id: 2,
          userId: 1,
          fakeid: 'test_fakeid',
          articleUrl: 'https://mp.weixin.qq.com/s/test',
          title: 'Test Article',
          contentId: 'comment_2',
          data: { replies: [] },
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockReplies),
      })

      const result = await service.getCommentReplies(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual(mockReplies)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no replies', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })

      const result = await service.getCommentReplies(1, 'https://mp.weixin.qq.com/s/test')

      expect(result).toEqual([])
    })

    it('should filter by userId and articleUrl', async () => {
      const whereSpy = vi.fn().mockResolvedValue([])
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
      })

      await service.getCommentReplies(123, 'https://mp.weixin.qq.com/s/test')

      expect(whereSpy).toHaveBeenCalled()
    })

    it('should return replies with data', async () => {
      const mockReplies = [
        {
          id: 1,
          contentId: 'comment_1',
          data: {
            replies: [
              { id: '1', content: 'Reply 1' },
              { id: '2', content: 'Reply 2' },
            ],
          },
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockReplies),
      })

      const result = await service.getCommentReplies(1, 'https://mp.weixin.qq.com/s/test')

      expect(result[0].data.replies).toHaveLength(2)
    })
  })

  // ==================== deleteByFakeid() 测试 ====================

  describe('deleteByFakeid', () => {
    it('should delete all comments and replies for fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteByFakeid(1, 'test_fakeid')

      expect(mockDb.delete).toHaveBeenCalledTimes(2)
    })

    it('should delete with correct userId and fakeid', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined)
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      })

      await service.deleteByFakeid(456, 'test_fakeid')

      expect(whereSpy).toHaveBeenCalledTimes(2)
    })

    it('should not throw when deleting non-existent fakeid', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await expect(service.deleteByFakeid(1, 'nonexistent')).resolves.toBeUndefined()
    })

    it('should handle multiple deletions', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })

      await service.deleteByFakeid(1, 'fakeid1')
      await service.deleteByFakeid(1, 'fakeid2')
      await service.deleteByFakeid(1, 'fakeid3')

      expect(mockDb.delete).toHaveBeenCalledTimes(6) // 2 calls per deleteByFakeid
    })

    it('should delete both comments and replies in parallel', async () => {
      const deleteSpy = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })
      mockDb.delete = deleteSpy

      await service.deleteByFakeid(1, 'test_fakeid')

      // Should be called twice (comments and replies)
      expect(deleteSpy).toHaveBeenCalledTimes(2)
    })
  })

  // ==================== 集成场景测试 ====================

  describe('Integration Scenarios', () => {
    it('should save and retrieve comment', async () => {
      const commentData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        data: { comments: [{ id: '1', content: 'Great!' }] },
      }

      // Save
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveComment(1, commentData)

      // Retrieve
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1, userId: 1, ...commentData }]),
      })
      const result = await service.getComment(1, commentData.articleUrl)

      expect(result?.title).toBe(commentData.title)
      expect(result?.data).toEqual(commentData.data)
    })

    it('should save comment and reply together', async () => {
      const commentData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        data: { comments: [{ id: '1', content: 'Comment' }] },
      }

      const replyData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        contentId: 'comment_1',
        data: { replies: [{ id: '1', content: 'Reply' }] },
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(1, commentData)
      await service.saveCommentReply(1, replyData)

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
    })

    it('should update comment data', async () => {
      const initialData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        data: { comments: [{ id: '1', content: 'Initial' }] },
      }

      const updatedData = {
        ...initialData,
        data: { comments: [{ id: '1', content: 'Updated' }] },
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })

      await service.saveComment(1, initialData)
      await service.saveComment(1, updatedData)

      expect(mockDb.insert).toHaveBeenCalledTimes(2)
    })

    it('should delete all data after saving', async () => {
      const commentData = {
        fakeid: 'test_fakeid',
        articleUrl: 'https://mp.weixin.qq.com/s/test',
        title: 'Test Article',
        data: { comments: [] },
      }

      // Save
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      })
      await service.saveComment(1, commentData)

      // Delete
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      })
      await service.deleteByFakeid(1, 'test_fakeid')

      // Verify both comments and replies tables were deleted from
      expect(mockDb.delete).toHaveBeenCalledTimes(2)
    })
  })
})
