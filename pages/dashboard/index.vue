<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">概览</h1>
      <p class="text-muted-foreground mt-1">查看数据统计和快速操作</p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="rounded-lg border border-border bg-background p-4">
        <div class="text-sm text-muted-foreground">{{ stat.label }}</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ stat.value }}</div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">快速操作</h2>
      <div class="flex flex-wrap gap-3">
        <a-button type="primary" @click="navigateTo('/dashboard/account')">
          <template #icon><icon-plus /></template>
          添加公众号
        </a-button>
        <a-button @click="navigateTo('/dashboard/single')">
          <template #icon><icon-link /></template>
          单篇下载
        </a-button>
        <a-button @click="navigateTo('/dashboard/exports')">
          <template #icon><icon-download /></template>
          导出任务
        </a-button>
      </div>
    </div>

    <!-- Recent accounts -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">已添加的公众号</h2>
      <div v-if="accounts.length === 0" class="text-center py-8 text-muted-foreground">
        暂无数据，请先添加公众号
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="account in accounts.slice(0, 6)"
          :key="account.fakeid"
          class="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer transition-colors"
          @click="navigateTo('/dashboard/article?fakeid=' + account.fakeid)"
        >
          <a-avatar :size="40" :image-url="account.roundHeadImg || undefined">
            {{ account.nickname?.[0] || '?' }}
          </a-avatar>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm text-foreground truncate">{{ account.nickname }}</div>
            <div class="text-xs text-muted-foreground">{{ account.syncedCount }} 篇文章</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconPlus, IconLink, IconDownload } from '@arco-design/web-vue/es/icon'

const { accounts, loadAccounts } = useDataStore()

const stats = computed(() => [
  { label: '公众号数量', value: accounts.value.length },
  { label: '文章总数', value: accounts.value.reduce((sum, a) => sum + a.syncedCount, 0) },
  { label: '已同步完成', value: accounts.value.filter(a => a.completed).length },
  { label: '自动同步', value: accounts.value.filter(a => a.autoSync).length },
])

onMounted(async () => {
  await loadAccounts()
})
</script>
