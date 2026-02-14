/**
 * MeiliSearch indexing service for article full-text search.
 * Indexes articles when they are created/updated so they are searchable.
 */
export class SearchService {
  private host: string
  private apiKey: string
  private indexName = 'articles'
  private available = true

  constructor() {
    const config = useRuntimeConfig()
    this.host = config.meiliHost || 'http://localhost:7700'
    this.apiKey = config.meiliKey || ''
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  /**
   * Ensure the articles index exists with proper settings
   */
  async ensureIndex() {
    if (!this.available) return

    try {
      // Create index if not exists
      await fetch(`${this.host}/indexes`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          uid: this.indexName,
          primaryKey: 'id',
        }),
      })

      // Configure searchable and filterable attributes
      await fetch(`${this.host}/indexes/${this.indexName}/settings`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          searchableAttributes: ['title', 'digest', 'authorName'],
          filterableAttributes: ['userId', 'fakeid', 'createTime', 'isDeleted'],
          sortableAttributes: ['createTime'],
          displayedAttributes: ['id', 'title', 'digest', 'authorName', 'link', 'fakeid', 'createTime', 'cover'],
        }),
      })

      console.log('[Search] MeiliSearch index configured')
    } catch (e: any) {
      console.warn('[Search] MeiliSearch not available:', e.message)
      this.available = false
    }
  }

  /**
   * Index a single article document
   */
  async indexArticle(article: {
    id: number
    userId: number
    fakeid: string
    title: string
    link: string
    cover?: string | null
    digest?: string | null
    authorName?: string | null
    createTime?: number | null
    isDeleted?: number
  }) {
    if (!this.available) return

    try {
      await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([{
          id: article.id,
          userId: article.userId,
          fakeid: article.fakeid,
          title: article.title,
          link: article.link,
          cover: article.cover || '',
          digest: article.digest || '',
          authorName: article.authorName || '',
          createTime: article.createTime || 0,
          isDeleted: article.isDeleted || 0,
        }]),
      })
    } catch {
      // Silently fail - search is optional
    }
  }

  /**
   * Index multiple articles in batch
   */
  async indexArticles(articles: Array<{
    id: number
    userId: number
    fakeid: string
    title: string
    link: string
    cover?: string | null
    digest?: string | null
    authorName?: string | null
    createTime?: number | null
    isDeleted?: number
  }>) {
    if (!this.available || articles.length === 0) return

    try {
      const docs = articles.map(a => ({
        id: a.id,
        userId: a.userId,
        fakeid: a.fakeid,
        title: a.title,
        link: a.link,
        cover: a.cover || '',
        digest: a.digest || '',
        authorName: a.authorName || '',
        createTime: a.createTime || 0,
        isDeleted: a.isDeleted || 0,
      }))

      // MeiliSearch accepts up to ~100MB per batch, split into chunks of 1000
      const chunkSize = 1000
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize)
        await fetch(`${this.host}/indexes/${this.indexName}/documents`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(chunk),
        })
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Remove an article from the search index
   */
  async deleteArticle(articleId: number) {
    if (!this.available) return

    try {
      await fetch(`${this.host}/indexes/${this.indexName}/documents/${articleId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
    } catch {
      // Silently fail
    }
  }

  /**
   * Remove all articles for a given fakeid from the index
   */
  async deleteByFakeid(userId: number, fakeid: string) {
    if (!this.available) return

    try {
      await fetch(`${this.host}/indexes/${this.indexName}/documents/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          filter: `userId = ${userId} AND fakeid = "${fakeid}"`,
        }),
      })
    } catch {
      // Silently fail
    }
  }
}

let _searchService: SearchService | null = null
export function getSearchService(): SearchService {
  if (!_searchService) _searchService = new SearchService()
  return _searchService
}
