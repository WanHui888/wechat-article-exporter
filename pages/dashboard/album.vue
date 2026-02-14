<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">合集下载</h1>
      <p class="text-muted-foreground mt-1">下载公众号文章合集</p>
    </div>

    <!-- Controls -->
    <div class="rounded-lg border border-border bg-background p-6">
      <a-form :model="form" layout="vertical">
        <a-form-item label="���众号">
          <a-select v-model="form.fakeid" placeholder="选择公众号" allow-search>
            <a-option v-for="a in accounts" :key="a.fakeid" :value="a.fakeid">
              {{ a.nickname || a.fakeid }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="合集 ID">
          <a-input v-model="form.albumId" placeholder="输入合集 ID" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" :loading="album.loading.value" @click="loadAlbum">
              加载合集
            </a-button>
            <a-button
              v-if="album.baseInfo.value"
              @click="album.toggleReverse(); loadAlbum()"
            >
              {{ album.isReverse.value ? '正序' : '倒序' }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <!-- Album Info -->
    <div v-if="album.baseInfo.value" class="rounded-lg border border-border bg-background overflow-hidden">
      <!-- Banner -->
      <div class="px-6 py-5 bg-gradient-to-r from-gray-900 to-gray-700">
        <h2 class="text-xl text-white font-bold"># {{ album.baseInfo.value.title }}</h2>
      </div>

      <!-- Album Meta -->
      <div class="px-6 py-3 border-b border-border flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img
            v-if="album.baseInfo.value.brand_icon"
            :src="album.baseInfo.value.brand_icon"
            class="w-5 h-5 rounded-full"
            alt=""
          />
          <span class="text-sm">{{ album.baseInfo.value.nickname }}</span>
          <span class="text-xs text-muted-foreground">
            {{ album.baseInfo.value.article_count }} 篇内容
          </span>
          <span v-if="album.baseInfo.value.description" class="text-xs text-muted-foreground">
            &middot; {{ album.baseInfo.value.description }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <a-button
            size="small"
            :loading="fetchAllLoading"
            :disabled="album.noMoreData.value"
            @click="fetchAllArticles"
          >
            抓取全部链接
          </a-button>
          <a-button
            type="primary"
            size="small"
            :loading="downloader.loading.value"
            :disabled="album.albumArticles.length === 0"
            @click="batchDownload"
          >
            {{ downloader.loading.value
              ? `下载中 ${downloader.completedCount.value}/${downloader.totalCount.value}`
              : `批量下载 (${album.albumArticles.length})` }}
          </a-button>
          <a-button
            v-if="downloader.loading.value"
            size="small"
            status="danger"
            @click="downloader.abort()"
          >
            中止
          </a-button>
          <a-dropdown :disabled="album.albumArticles.length === 0" @select="handleExport">
            <a-button size="small" :disabled="album.albumArticles.length === 0">
              导出
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
        </div>
      </div>

      <!-- Article List -->
      <div class="max-h-[600px] overflow-y-auto">
        <ul class="divide-y divide-border">
          <li
            v-for="(article, index) in album.albumArticles"
            :key="article.key || index"
            class="flex items-center justify-between px-6 py-4 hover:bg-muted/50"
          >
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium truncate">
                <span v-if="article.pos_num" class="text-muted-foreground">{{ article.pos_num }}. </span>
                {{ article.title }}
              </h3>
              <time class="text-xs text-muted-foreground">
                {{ formatTime(+article.create_time) }}
              </time>
            </div>
            <img
              v-if="article.cover_img_1_1"
              :src="article.cover_img_1_1"
              class="w-14 h-14 ml-4 flex-shrink-0 rounded object-cover"
              alt=""
            />
          </li>
        </ul>

        <!-- Load More -->
        <div v-if="!album.noMoreData.value" class="flex justify-center py-4">
          <a-button
            :loading="album.articleLoading.value"
            size="small"
            @click="album.loadMore(form.fakeid, form.albumId)"
          >
            加载更多
          </a-button>
        </div>
        <p v-else class="text-center py-4 text-sm text-muted-foreground">
          已全部加载完毕 ({{ album.albumArticles.length }} 篇)
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { IconDown } from '@arco-design/web-vue/es/icon'
import { apiCreateExportJob } from '~/apis/data'
import type { ExportFormat } from '~/types'

const { accounts, loadAccounts } = useDataStore()
const album = useAlbum()
const downloader = useDownloader()

const form = reactive({ fakeid: '', albumId: '' })
const fetchAllLoading = ref(false)

onMounted(() => loadAccounts())

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function loadAlbum() {
  if (!form.fakeid || !form.albumId) {
    Message.warning('请填写完整信息')
    return
  }
  await album.fetchFirstPage(form.fakeid, form.albumId)
}

async function fetchAllArticles() {
  fetchAllLoading.value = true
  try {
    await album.fetchAll(form.fakeid, form.albumId)
    Message.success(`已加载全部 ${album.albumArticles.length} 篇文章`)
  } finally {
    fetchAllLoading.value = false
  }
}

async function batchDownload() {
  const urls = album.albumArticles.map(a => a.url)
  if (urls.length === 0) return

  await downloader.downloadArticleHTML(urls, form.fakeid, {
    onProgress: (_url, index) => {
      // Progress is tracked by downloader composable
    },
    onError: (url, error) => {
      console.warn(`Failed to download ${url}: ${error}`)
    },
  })

  Message.success(`下载完成: ${downloader.completedCount.value}/${downloader.totalCount.value}`)
}

async function handleExport(format: string | number | Record<string, any> | undefined) {
  const urls = album.albumArticles.map(a => a.url)
  if (urls.length === 0) return

  try {
    await apiCreateExportJob(format as ExportFormat, urls, form.fakeid)
    Message.success('导出任务已创建，请前往「导出任务」页面查看')
    navigateTo('/dashboard/exports')
  } catch (e: any) {
    Message.error(e.message || '创建导出任务失败')
  }
}
</script>
