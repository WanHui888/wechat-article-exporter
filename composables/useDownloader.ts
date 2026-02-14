import { ref } from 'vue'
import { apiSaveMetadata, apiSaveComment, apiSaveCommentReply } from '~/apis/data'

const BATCH_CHUNK_SIZE = 50

interface DownloadHTMLResult {
  total: number
  completed: number
  failed: number
  skipped: number
  loginExpired: boolean
  failedUrls: Array<{ url: string; error?: string }>
}

export function useDownloader() {
  const loading = ref(false)
  const completedCount = ref(0)
  const totalCount = ref(0)
  const currentPhase = ref('')
  const aborted = ref(false)
  const failedUrls = ref<Array<{ url: string; error?: string }>>([])
  const skippedCount = ref(0)
  const failedCount = ref(0)
  const loginExpired = ref(false)

  async function downloadArticleHTML(
    urls: string[],
    fakeid: string,
    options?: {
      onProgress?: (completed: number, total: number) => void
      onError?: (url: string, error: string) => void
      onLoginExpired?: () => void
    },
  ): Promise<DownloadHTMLResult> {
    loading.value = true
    completedCount.value = 0
    totalCount.value = urls.length
    currentPhase.value = '下载文章内容'
    aborted.value = false
    failedUrls.value = []
    skippedCount.value = 0
    failedCount.value = 0
    loginExpired.value = false

    const allResults: DownloadHTMLResult = {
      total: urls.length,
      completed: 0,
      failed: 0,
      skipped: 0,
      loginExpired: false,
      failedUrls: [],
    }

    try {
      // Split into chunks for large batches
      const chunks: string[][] = []
      for (let i = 0; i < urls.length; i += BATCH_CHUNK_SIZE) {
        chunks.push(urls.slice(i, i + BATCH_CHUNK_SIZE))
      }

      for (const chunk of chunks) {
        if (aborted.value || loginExpired.value) break

        try {
          const response = await $fetch<{
            success: boolean
            data: {
              total: number
              completed: number
              failed: number
              skipped: number
              loginExpired: boolean
              results: Array<{
                url: string
                status: 'completed' | 'failed' | 'skipped'
                title?: string
                error?: string
              }>
            }
          }>('/api/web/article/batch-download', {
            method: 'POST',
            body: { articleUrls: chunk, fakeid, concurrency: 2 },
          })

          if (response.success && response.data) {
            const data = response.data
            allResults.completed += data.completed
            allResults.failed += data.failed
            allResults.skipped += data.skipped

            // Collect failed URLs
            for (const r of data.results) {
              if (r.status === 'failed') {
                allResults.failedUrls.push({ url: r.url, error: r.error })
              }
            }

            // Update reactive state
            completedCount.value = allResults.completed + allResults.skipped
            failedCount.value = allResults.failed
            skippedCount.value = allResults.skipped
            failedUrls.value = allResults.failedUrls

            options?.onProgress?.(completedCount.value, totalCount.value)

            // Handle login expiry
            if (data.loginExpired) {
              loginExpired.value = true
              allResults.loginExpired = true
              options?.onLoginExpired?.()
              break
            }
          }
        } catch (e: any) {
          // Network or server error for this chunk
          for (const url of chunk) {
            allResults.failed++
            allResults.failedUrls.push({ url, error: e.message || 'Request failed' })
            options?.onError?.(url, e.message || 'Request failed')
          }
          failedCount.value = allResults.failed
          failedUrls.value = allResults.failedUrls
        }
      }
    } finally {
      loading.value = false
      currentPhase.value = ''
    }

    return allResults
  }

  async function downloadArticleMetadata(
    urls: string[],
    fakeid: string,
    credential: { biz: string; uin: string; key: string; pass_ticket: string },
    options?: {
      onProgress?: (url: string, index: number) => void
      onError?: (url: string, error: string) => void
    },
  ) {
    loading.value = true
    completedCount.value = 0
    totalCount.value = urls.length
    currentPhase.value = '下载阅读量'
    aborted.value = false

    try {
      for (let i = 0; i < urls.length; i++) {
        if (aborted.value) break

        const url = urls[i]!
        try {
          // Parse mid, idx, sn from article URL
          const urlObj = new URL(url)
          const mid = urlObj.searchParams.get('mid') || ''
          const idx = urlObj.searchParams.get('idx') || '1'
          const sn = urlObj.searchParams.get('sn') || ''

          if (!mid) {
            options?.onError?.(url, 'URL 缺少 mid 参数')
            completedCount.value = i + 1
            continue
          }

          // Get article title from stored data
          const articleData = await $fetch<any>('/api/data/articles', {
            params: { fakeid, keyword: '', page: 1, pageSize: 1 },
          })
          const articles = articleData?.data?.items || articleData?.items || []
          const article = articles.find((a: any) => a.link === url)
          const title = article?.title || ''

          // Fetch metadata via getappmsgext API
          const response = await $fetch<any>('/api/web/misc/appmsgext', {
            params: {
              __biz: credential.biz,
              mid,
              idx,
              sn,
              uin: credential.uin,
              key: credential.key,
              pass_ticket: credential.pass_ticket,
            },
          })

          if (response?.success && response.data) {
            const stat = response.data.appmsgstat || {}
            await apiSaveMetadata({
              fakeid,
              articleUrl: url,
              title,
              readNum: stat.read_num || 0,
              oldLikeNum: stat.old_like_num || 0,
              likeNum: stat.like_num || 0,
              shareNum: stat.share_num || 0,
              commentNum: stat.comment_count || 0,
            })
          }

          completedCount.value = i + 1
          options?.onProgress?.(url, i)
        } catch (e: any) {
          options?.onError?.(url, e.message)
        }

        await new Promise(r => setTimeout(r, 1000))
      }
    } finally {
      loading.value = false
      currentPhase.value = ''
    }
  }

  async function downloadArticleComments(
    urls: string[],
    fakeid: string,
    credential: { biz: string; uin: string; key: string; pass_ticket: string },
    options?: {
      onProgress?: (url: string, index: number) => void
      onError?: (url: string, error: string) => void
    },
  ) {
    loading.value = true
    completedCount.value = 0
    totalCount.value = urls.length
    currentPhase.value = '下载评论'
    aborted.value = false

    try {
      for (let i = 0; i < urls.length; i++) {
        if (aborted.value) break

        const url = urls[i]!
        try {
          const titleMatch = url.match(/[?&]title=([^&]*)/)
          const title = titleMatch ? decodeURIComponent(titleMatch[1]!) : ''

          // Get comment_id from stored HTML
          const htmlData = await $fetch<any>('/api/data/html', { params: { url } })
          const commentId = htmlData?.data?.commentId

          if (commentId) {
            const response = await $fetch<any>('/api/web/misc/comment', {
              params: {
                __biz: credential.biz,
                comment_id: commentId,
                uin: credential.uin,
                key: credential.key,
                pass_ticket: credential.pass_ticket,
              },
            })

            if (response) {
              await apiSaveComment({
                fakeid,
                articleUrl: url,
                title,
                data: response,
              })
            }
          }

          completedCount.value = i + 1
          options?.onProgress?.(url, i)
        } catch (e: any) {
          options?.onError?.(url, e.message)
        }

        await new Promise(r => setTimeout(r, 1000))
      }
    } finally {
      loading.value = false
      currentPhase.value = ''
    }
  }

  function abort() {
    aborted.value = true
  }

  return {
    loading,
    completedCount,
    totalCount,
    currentPhase,
    aborted,
    failedUrls,
    skippedCount,
    failedCount,
    loginExpired,
    downloadArticleHTML,
    downloadArticleMetadata,
    downloadArticleComments,
    abort,
  }
}
