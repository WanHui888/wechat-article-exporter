<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-foreground">文章列表</h1>
        <p class="text-muted-foreground mt-1" v-if="currentAccount">
          {{ currentAccount.nickname }} · {{ total }} 篇文章
          <span v-if="currentAccount.completed" class="text-green-500 ml-1">(已完成同步)</span>
        </p>
      </div>
      <div class="flex gap-2">
        <a-select v-model="selectedFakeid" placeholder="选择公众号" style="width: 200px" @change="handleAccountChange">
          <a-option v-for="a in accounts" :key="a.fakeid" :value="a.fakeid">
            {{ a.nickname }}
          </a-option>
        </a-select>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-3 flex-wrap">
      <a-input-search
        v-model="keyword"
        placeholder="搜索文章标题"
        allow-clear
        style="width: 240px"
        @search="loadData"
      />

      <!-- Sync Button -->
      <a-button
        type="primary"
        :loading="syncing"
        :disabled="!selectedFakeid || !isWeChatLoggedIn"
        @click="syncArticles"
      >
        <template #icon><icon-sync /></template>
        {{ syncing ? `同步中 ${syncProgress}` : '同步文章' }}
      </a-button>

      <!-- Stop Sync -->
      <a-button v-if="syncing" status="danger" @click="abortSync">
        中止
      </a-button>

      <!-- Download Selected -->
      <a-dropdown
        :disabled="selectedRows.length === 0"
        @select="handleDownload"
      >
        <a-button :disabled="selectedRows.length === 0">
          下载 ({{ selectedRows.length }})
          <icon-down />
        </a-button>
        <template #content>
          <a-doption value="html">下载文章内容</a-doption>
          <a-doption value="metadata">下载阅读量</a-doption>
          <a-doption value="comment">下载评论</a-doption>
        </template>
      </a-dropdown>

      <!-- Export Selected -->
      <a-dropdown
        :disabled="selectedRows.length === 0"
        @select="handleExport"
      >
        <a-button :disabled="selectedRows.length === 0">
          导出 ({{ selectedRows.length }})
          <icon-down />
        </a-button>
        <template #content>
          <a-doption value="html">HTML</a-doption>
          <a-doption value="excel">Excel</a-doption>
          <a-doption value="json">JSON</a-doption>
          <a-doption value="txt">TXT</a-doption>
          <a-doption value="markdown">Markdown</a-doption>
          <a-doption value="word">Word</a-doption>
        </template>
      </a-dropdown>

      <!-- Download progress -->
      <span v-if="downloader.loading.value" class="text-sm text-muted-foreground">
        {{ downloader.currentPhase.value }}: {{ downloader.completedCount.value }}/{{ downloader.totalCount.value }}
        <span v-if="downloader.failedCount.value > 0" class="text-red-500 ml-1">
          ({{ downloader.failedCount.value }} 失败)
        </span>
      </span>

      <!-- Abort download -->
      <a-button v-if="downloader.loading.value" status="danger" size="small" @click="downloader.abort()">
        中止下载
      </a-button>

      <!-- Retry failed -->
      <a-button
        v-if="!downloader.loading.value && lastFailedUrls.length > 0"
        status="warning"
        size="small"
        @click="retryFailed"
      >
        重试失败 ({{ lastFailedUrls.length }})
      </a-button>
    </div>

    <!-- Download progress bar -->
    <div v-if="downloader.loading.value" class="rounded-lg border border-border bg-background p-4">
      <div class="flex items-center justify-between text-sm mb-2">
        <span>{{ downloader.currentPhase.value }}...</span>
        <span class="font-mono">
          {{ downloader.completedCount.value }}/{{ downloader.totalCount.value }}
          <span v-if="downloader.skippedCount.value > 0" class="text-gray-400 ml-1">({{ downloader.skippedCount.value }} 已跳过)</span>
          <span v-if="downloader.failedCount.value > 0" class="text-red-500 ml-1">({{ downloader.failedCount.value }} 失败)</span>
        </span>
      </div>
      <a-progress :percent="downloadPercent" :show-text="false" size="small" />
    </div>

    <!-- Download result summary -->
    <div v-if="downloadSummary" class="rounded-lg border border-border bg-background p-4">
      <div class="flex items-center justify-between">
        <div class="text-sm">
          <span class="font-medium">下载完成: </span>
          <span class="text-green-500">{{ downloadSummary.completed }} 成功</span>
          <span v-if="downloadSummary.skipped > 0" class="text-gray-400 ml-2">{{ downloadSummary.skipped }} 已跳过</span>
          <span v-if="downloadSummary.failed > 0" class="text-red-500 ml-2">{{ downloadSummary.failed }} 失败</span>
          <span v-if="downloadSummary.loginExpired" class="text-orange-500 ml-2">（登录已过期）</span>
        </div>
        <a-button type="text" size="mini" @click="downloadSummary = null">关闭</a-button>
      </div>
    </div>

    <!-- Sync progress bar -->
    <div v-if="syncing" class="rounded-lg border border-border bg-background p-4">
      <div class="flex items-center justify-between text-sm mb-2">
        <span>正在从微信同步文章列表...</span>
        <span class="font-mono">{{ syncProgress }}</span>
      </div>
      <a-progress :percent="syncPercent" :show-text="false" size="small" />
    </div>

    <!-- Article table -->
    <div class="rounded-lg border border-border bg-background overflow-hidden">
      <a-table
        :data="articleList"
        :loading="loading"
        :pagination="{ total, current: page, pageSize, showTotal: true, showPageSize: true }"
        :bordered="false"
        :row-selection="{ type: 'checkbox', showCheckedAll: true }"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        @selection-change="handleSelectionChange"
      >
        <template #columns>
          <a-table-column title="标题" data-index="title" :width="300" ellipsis tooltip />
          <a-table-column title="作者" data-index="authorName" :width="100" />
          <a-table-column title="发布时间" :width="160">
            <template #cell="{ record }">
              {{ record.createTime ? new Date(record.createTime * 1000).toLocaleString('zh-CN') : '-' }}
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">
              <a-tag v-if="record.isDeleted" color="red" size="small">已删除</a-tag>
              <a-tag v-else color="green" size="small">正常</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="120" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="mini" @click="toggleFavorite(record)">
                  <template #icon>
                    <icon-star-fill v-if="record.isFavorited" style="color: #f59e0b" />
                    <icon-star v-else />
                  </template>
                </a-button>
                <a-button type="text" size="mini" @click="openArticle(record.link)">
                  <template #icon><icon-link /></template>
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconSync, IconStar, IconStarFill, IconLink, IconDown } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import type { Article, ExportFormat } from '~/types'
import { apiToggleFavorite, apiUpsertArticles, apiCreateExportJob, apiUpdateSyncProgress } from '~/apis/data'
import { getArticleList } from '~/apis'

const route = useRoute()
const { accounts, loadAccounts, loadArticles } = useDataStore()
const { isWeChatLoggedIn, requireWeChatLogin, openLoginModal } = useWeChatSession()
const downloader = useDownloader()

const selectedFakeid = ref((route.query.fakeid as string) || '')
const keyword = ref('')
const articleList = ref<Article[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const loading = ref(false)
const selectedRows = ref<Article[]>([])

// Download state
const lastFailedUrls = ref<string[]>([])
const downloadSummary = ref<{
  completed: number
  failed: number
  skipped: number
  loginExpired: boolean
} | null>(null)

const downloadPercent = computed(() => {
  if (downloader.totalCount.value <= 0) return 0
  return Math.round(((downloader.completedCount.value + downloader.failedCount.value) / downloader.totalCount.value) * 100)
})

// Sync state
const syncing = ref(false)
const syncAborted = ref(false)
const syncedCount = ref(0)
const syncTotalCount = ref(0)

const syncProgress = computed(() => {
  if (syncTotalCount.value > 0) {
    return `${syncedCount.value}/${syncTotalCount.value}`
  }
  return `${syncedCount.value} 篇`
})

const syncPercent = computed(() => {
  if (syncTotalCount.value <= 0) return 0
  return Math.round((syncedCount.value / syncTotalCount.value) * 100)
})

const currentAccount = computed(() =>
  accounts.value.find(a => a.fakeid === selectedFakeid.value)
)

onMounted(async () => {
  await loadAccounts()
  if (selectedFakeid.value) {
    await loadData()
  }
})

function handleAccountChange() {
  page.value = 1
  keyword.value = ''
  selectedRows.value = []
  loadData()
}

async function loadData() {
  if (!selectedFakeid.value) return
  loading.value = true
  try {
    const result = await loadArticles(selectedFakeid.value, {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    articleList.value = result.items
    total.value = result.total
  } catch {
    Message.error('加载文章列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

function handlePageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  loadData()
}

function handleSelectionChange(keys: (string | number)[]) {
  selectedRows.value = articleList.value.filter(a => keys.includes(a.id))
}

async function toggleFavorite(record: Article) {
  try {
    await apiToggleFavorite(record.id, !record.isFavorited)
    record.isFavorited = !record.isFavorited
  } catch {
    Message.error('操作失败')
  }
}

function openArticle(url: string) {
  window.open(url, '_blank')
}

// === Sync ===
async function syncArticles() {
  if (!selectedFakeid.value) return
  if (!requireWeChatLogin()) return

  syncing.value = true
  syncAborted.value = false
  syncedCount.value = 0
  syncTotalCount.value = 0

  const fakeid = selectedFakeid.value
  const PAGE_SIZE = 20
  let begin = currentAccount.value?.syncedCount || 0

  try {
    // Fetch first page to get total_count
    const firstResp = await getArticleList(fakeid, begin, '', PAGE_SIZE)
    if (firstResp.base_resp?.ret !== 0) {
      if (firstResp.base_resp?.ret === 200003) {
        Message.error('微信登录已过期，请重新登录')
        return
      }
      throw new Error(firstResp.base_resp?.err_msg || '同步失败')
    }

    const publishPage = typeof firstResp.publish_page === 'string'
      ? JSON.parse(firstResp.publish_page)
      : firstResp.publish_page

    syncTotalCount.value = publishPage.total_count || 0

    // Process first batch
    await processPublishList(fakeid, publishPage.publish_list || [])
    begin += PAGE_SIZE

    // Continue fetching until done
    while (!syncAborted.value && begin < syncTotalCount.value) {
      await new Promise(r => setTimeout(r, 1000)) // Rate limit

      const resp = await getArticleList(fakeid, begin, '', PAGE_SIZE)
      if (resp.base_resp?.ret !== 0) {
        if (resp.base_resp?.ret === 200003) {
          Message.error('微信登录已过期')
          break
        }
        break
      }

      const page = typeof resp.publish_page === 'string'
        ? JSON.parse(resp.publish_page)
        : resp.publish_page

      const list = page.publish_list || []
      if (list.length === 0) break

      await processPublishList(fakeid, list)
      begin += PAGE_SIZE
    }

    // Update sync progress on account
    await apiUpdateSyncProgress(fakeid, {
      syncedCount: syncedCount.value,
      completed: begin >= syncTotalCount.value ? 1 : 0,
      totalCount: syncTotalCount.value,
    })

    if (syncAborted.value) {
      Message.warning(`同步已中止，已同步 ${syncedCount.value} 篇`)
    } else {
      Message.success(`同步完成，共 ${syncedCount.value} 篇文章`)
    }

    // Reload the article list
    await loadData()
    await loadAccounts()
  } catch (e: any) {
    Message.error(e.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

async function processPublishList(fakeid: string, publishList: any[]) {
  const articles: any[] = []

  for (const item of publishList) {
    if (syncAborted.value) break

    try {
      const publishInfo = typeof item.publish_info === 'string'
        ? JSON.parse(item.publish_info)
        : item.publish_info

      const appmsgex = publishInfo?.appmsgex || []
      for (const article of appmsgex) {
        articles.push({
          fakeid,
          aid: article.aid,
          title: article.title,
          link: article.link,
          cover: article.cover || article.pic_cdn_url_1_1 || '',
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
          mediaDuration: article.media_duration || '',
          albumId: article.album_id || '',
          appmsgAlbumInfos: article.appmsg_album_infos || [],
        })
        syncedCount.value++
      }
    } catch {
      // Skip malformed entries
    }
  }

  if (articles.length > 0) {
    await apiUpsertArticles(articles)
  }
}

function abortSync() {
  syncAborted.value = true
}

// === Download ===
async function handleDownload(type: string | number | Record<string, any> | undefined) {
  const urls = selectedRows.value.map(a => a.link)
  if (urls.length === 0) return

  const fakeid = selectedFakeid.value
  switch (type) {
    case 'html': {
      downloadSummary.value = null
      lastFailedUrls.value = []

      const result = await downloader.downloadArticleHTML(urls, fakeid, {
        onLoginExpired: () => {
          Message.warning('微信登录已过期，请重新登录')
          openLoginModal()
        },
      })

      // Store failed URLs for retry
      lastFailedUrls.value = result.failedUrls.map(f => f.url)

      // Show summary
      downloadSummary.value = {
        completed: result.completed,
        failed: result.failed,
        skipped: result.skipped,
        loginExpired: result.loginExpired,
      }

      if (result.loginExpired) {
        Message.warning(`下载中断：微信登录已过期。已完成 ${result.completed} 篇，${result.failed} 篇失败`)
      } else if (result.failed > 0) {
        Message.warning(`下载完成：${result.completed} 篇成功，${result.failed} 篇失败`)
      } else {
        Message.success(`下载完成：${result.completed} 篇成功${result.skipped > 0 ? `，${result.skipped} 篇已跳过` : ''}`)
      }
      break
    }
    case 'metadata':
    case 'comment':
      Message.info('此功能需要配置 Credential，请在设置中添加')
      break
  }
}

async function retryFailed() {
  if (lastFailedUrls.value.length === 0) return
  const urls = [...lastFailedUrls.value]
  const fakeid = selectedFakeid.value

  downloadSummary.value = null
  lastFailedUrls.value = []

  const result = await downloader.downloadArticleHTML(urls, fakeid, {
    onLoginExpired: () => {
      Message.warning('微信登录已过期，请重新登录')
      openLoginModal()
    },
  })

  lastFailedUrls.value = result.failedUrls.map(f => f.url)
  downloadSummary.value = {
    completed: result.completed,
    failed: result.failed,
    skipped: result.skipped,
    loginExpired: result.loginExpired,
  }

  if (result.failed > 0) {
    Message.warning(`重试完成：${result.completed} 篇成功，${result.failed} 篇仍然失败`)
  } else {
    Message.success(`重试完成：${result.completed} 篇全部成功`)
  }
}

// === Export ===
async function handleExport(format: string | number | Record<string, any> | undefined) {
  const urls = selectedRows.value.map(a => a.link)
  if (urls.length === 0) return

  try {
    await apiCreateExportJob(format as ExportFormat, urls, selectedFakeid.value)
    Message.success('导出任务已创建，请前往「导出任务」页面查看')
    navigateTo('/dashboard/exports')
  } catch (e: any) {
    Message.error(e.message || '创建导出任务失败')
  }
}
</script>
