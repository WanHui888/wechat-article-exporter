<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">单篇下载</h1>
      <p class="text-muted-foreground mt-1">通过文章链接下载单篇文章</p>
    </div>

    <!-- URL Input -->
    <div class="rounded-lg border border-border bg-background p-6">
      <a-form layout="vertical">
        <a-form-item label="文章链接" help="支持多个链接，每行一个">
          <a-textarea
            v-model="inputUrls"
            placeholder="粘贴微信公众号文章链接，每行一个"
            :auto-size="{ minRows: 3, maxRows: 8 }"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="adding" @click="addArticles">
            添加文章
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <!-- Article List -->
    <div v-if="articles.length > 0" class="rounded-lg border border-border bg-background">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <span class="text-sm text-muted-foreground">
          共 {{ articles.length }} 篇文章，已下载 {{ downloadedCount }} 篇
        </span>
        <div class="flex items-center gap-2">
          <!-- Download Button -->
          <a-button
            type="primary"
            size="small"
            :loading="downloader.loading.value"
            :disabled="pendingUrls.length === 0"
            @click="downloadAll"
          >
            {{ downloader.loading.value
              ? `下载中 ${downloader.completedCount.value}/${downloader.totalCount.value}`
              : `下载 (${pendingUrls.length})` }}
          </a-button>
          <!-- Abort Button -->
          <a-button
            v-if="downloader.loading.value"
            size="small"
            status="danger"
            @click="downloader.abort()"
          >
            中止
          </a-button>
          <!-- Export Button -->
          <a-dropdown :disabled="downloadedUrls.length === 0" @select="handleExport">
            <a-button size="small" :disabled="downloadedUrls.length === 0">
              导出 ({{ downloadedUrls.length }})
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
          <!-- Clear Button -->
          <a-button size="small" @click="clearAll">清空</a-button>
        </div>
      </div>

      <a-table
        :data="articles"
        :pagination="false"
        :bordered="false"
        row-key="url"
        size="small"
      >
        <template #columns>
          <a-table-column title="标题" data-index="title" :width="300" ellipsis tooltip />
          <a-table-column title="链接" data-index="url" :width="300" ellipsis tooltip>
            <template #cell="{ record }">
              <a :href="record.url" target="_blank" class="text-primary hover:underline text-xs font-mono">
                {{ record.url }}
              </a>
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="120" align="center">
            <template #cell="{ record }">
              <a-tag v-if="record.status === 'pending'" size="small" color="gray">等待下载</a-tag>
              <a-tag v-else-if="record.status === 'downloading'" size="small" color="blue">
                <icon-loading class="animate-spin mr-1" />下载中
              </a-tag>
              <a-tag v-else-if="record.status === 'completed'" size="small" color="green">已完成</a-tag>
              <a-tag v-else-if="record.status === 'error'" size="small" color="red">
                {{ record.error || '失败' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="80" align="center">
            <template #cell="{ record }">
              <a-button type="text" size="mini" status="danger" @click="removeArticle(record.url)">
                移除
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { IconDown, IconLoading } from '@arco-design/web-vue/es/icon'
import { apiCreateExportJob } from '~/apis/data'
import type { ExportFormat } from '~/types'

interface ArticleItem {
  url: string
  title: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  error?: string
}

const inputUrls = ref('')
const adding = ref(false)
const articles = reactive<ArticleItem[]>([])

const downloader = useDownloader()
const { requireWeChatLogin } = useWeChatSession()

const downloadedCount = computed(() => articles.filter(a => a.status === 'completed').length)
const pendingUrls = computed(() => articles.filter(a => a.status === 'pending' || a.status === 'error').map(a => a.url))
const downloadedUrls = computed(() => articles.filter(a => a.status === 'completed').map(a => a.url))

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) throw new Error('链接不能为空')
  const hasProtocol = /^https?:\/\//i.test(trimmed)
  const normalized = hasProtocol ? trimmed : `https://${trimmed}`
  const parsed = new URL(normalized)
  if (parsed.hostname !== 'mp.weixin.qq.com') {
    throw new Error(`无效链接: ${trimmed}`)
  }
  return parsed.toString()
}

function addArticles() {
  const lines = inputUrls.value.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    Message.warning('请输入文章链接')
    return
  }

  adding.value = true
  let addedCount = 0
  let errorCount = 0

  for (const line of lines) {
    try {
      const url = normalizeUrl(line)
      if (articles.some(a => a.url === url)) continue
      articles.push({ url, title: '未命名文章', status: 'pending' })
      addedCount++
    } catch {
      errorCount++
    }
  }

  adding.value = false
  inputUrls.value = ''

  if (addedCount > 0) Message.success(`已添加 ${addedCount} 篇文章`)
  if (errorCount > 0) Message.warning(`${errorCount} 个链接格式无效已跳过`)
}

async function downloadAll() {
  const urls = pendingUrls.value
  if (urls.length === 0) return

  // Mark all as downloading
  for (const article of articles) {
    if (article.status === 'pending' || article.status === 'error') {
      article.status = 'downloading'
    }
  }

  const fakeid = 'SINGLE_DOWNLOAD'
  await downloader.downloadArticleHTML(urls, fakeid, {
    onProgress: (url) => {
      const article = articles.find(a => a.url === url)
      if (article) {
        article.status = 'completed'
        // Try to extract title from what was saved
        extractTitle(url)
      }
    },
    onError: (url, error) => {
      const article = articles.find(a => a.url === url)
      if (article) {
        article.status = 'error'
        article.error = error
      }
    },
  })

  // Mark any still-downloading as completed or error (in case of abort)
  for (const article of articles) {
    if (article.status === 'downloading') {
      article.status = downloader.aborted.value ? 'pending' : 'error'
    }
  }
}

async function extractTitle(url: string) {
  try {
    const html = await $fetch<any>('/api/data/html', {
      params: { url },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
    })
    if (html?.data?.title) {
      const article = articles.find(a => a.url === url)
      if (article) article.title = html.data.title
    }
  } catch {
    // ignore
  }
}

async function handleExport(format: string | number | Record<string, any> | undefined) {
  const urls = downloadedUrls.value
  if (urls.length === 0) return

  try {
    await apiCreateExportJob(format as ExportFormat, urls, 'SINGLE_DOWNLOAD')
    Message.success('导出任务已创建，请前往「导出任务」页面查看')
    navigateTo('/dashboard/exports')
  } catch (e: any) {
    Message.error(e.message || '创建导出任务失败')
  }
}

function removeArticle(url: string) {
  const idx = articles.findIndex(a => a.url === url)
  if (idx >= 0) articles.splice(idx, 1)
}

function clearAll() {
  articles.splice(0, articles.length)
}
</script>
