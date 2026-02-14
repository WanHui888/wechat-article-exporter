<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">全文搜索</h1>
      <p class="text-muted-foreground mt-1">搜索已下载文章的标题和摘要</p>
    </div>

    <a-input-search
      v-model="query"
      placeholder="输入搜索关键词"
      search-button
      allow-clear
      size="large"
      @search="handleSearch"
      @press-enter="handleSearch"
    />

    <div v-if="results.length > 0" class="space-y-3">
      <div class="text-sm text-muted-foreground">
        找到约 {{ estimatedTotal }} 条结果
      </div>
      <div
        v-for="hit in results"
        :key="hit.id"
        class="rounded-lg border border-border bg-background p-4 hover:bg-muted/50 cursor-pointer transition-colors"
        @click="openArticle(hit.link)"
      >
        <h3 class="font-medium text-foreground" v-html="hit._formatted?.title || hit.title" />
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2" v-html="hit._formatted?.digest || hit.digest || ''" />
      </div>
    </div>

    <div v-else-if="searched && results.length === 0" class="text-center py-12 text-muted-foreground">
      未找到匹配的文章
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'

const query = ref('')
const results = ref<any[]>([])
const estimatedTotal = ref(0)
const searched = ref(false)

async function handleSearch() {
  if (!query.value.trim()) return
  searched.value = true
  try {
    const resp = await $fetch<any>('/api/search/articles', {
      params: { q: query.value, limit: 20 },
    })
    if (resp.success) {
      results.value = resp.data.hits
      estimatedTotal.value = resp.data.estimatedTotalHits
    }
  } catch {
    Message.error('搜索服务不可用')
  }
}

function openArticle(url: string) {
  if (url) window.open(url, '_blank')
}
</script>
