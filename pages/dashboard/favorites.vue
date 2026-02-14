<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">收藏</h1>
      <p class="text-muted-foreground mt-1">已收藏的文章</p>
    </div>

    <div class="rounded-lg border border-border bg-background overflow-hidden">
      <a-table
        :data="articles"
        :loading="loading"
        :pagination="{ total, current: page, pageSize }"
        :bordered="false"
        row-key="id"
        @page-change="handlePageChange"
      >
        <template #columns>
          <a-table-column title="标题" data-index="title" ellipsis />
          <a-table-column title="发布时间" :width="160">
            <template #cell="{ record }">
              {{ record.createTime ? new Date(record.createTime * 1000).toLocaleString('zh-CN') : '-' }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="mini" @click="openArticle(record.link)">查看</a-button>
                <a-button type="text" size="mini" status="danger" @click="removeFav(record)">取消</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { apiGetFavoritedArticles, apiToggleFavorite } from '~/apis/data'
import type { Article } from '~/types'

const articles = ref<Article[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const loading = ref(false)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const result = await apiGetFavoritedArticles(page.value, pageSize.value)
    articles.value = result.items
    total.value = result.total
  } catch {
    Message.error('加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

async function removeFav(record: Article) {
  try {
    await apiToggleFavorite(record.id, false)
    articles.value = articles.value.filter(a => a.id !== record.id)
    total.value--
    Message.success('已取消收藏')
  } catch {
    Message.error('操作失败')
  }
}

function openArticle(url: string) {
  window.open(url, '_blank')
}
</script>
