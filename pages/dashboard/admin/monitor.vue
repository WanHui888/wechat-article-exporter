<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">系统监控</h1>
      <p class="text-muted-foreground mt-1">查看服务器运行状态</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="item in statsCards" :key="item.label" class="rounded-lg border border-border bg-background p-4">
        <div class="text-sm text-muted-foreground">{{ item.label }}</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ item.value }}</div>
        <a-progress v-if="item.percent !== undefined" :percent="item.percent / 100" size="small" class="mt-2" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'

const stats = ref<any>(null)

const statsCards = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: 'CPU 使用率', value: `${s.cpu || 0}%`, percent: s.cpu },
    { label: '内存使用', value: `${formatSize(s.memory?.used || 0)} / ${formatSize(s.memory?.total || 0)}`, percent: s.memory?.percent },
    { label: '磁盘使用', value: `${formatSize(s.disk?.used || 0)} / ${formatSize(s.disk?.total || 0)}`, percent: s.disk?.percent },
    { label: '磁盘可用', value: formatSize(s.disk?.free || 0) },
    { label: '用户数', value: s.userCount || 0 },
    { label: '文章数', value: s.articleCount || 0 },
    { label: '存储占用', value: formatSize(s.storageUsed || 0) },
    { label: '运行时间', value: formatUptime(s.uptime || 0) },
  ]
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return d > 0 ? `${d}天${h}时` : `${h}小时`
}

onMounted(async () => {
  try {
    const resp = await $fetch<any>('/api/admin/monitor')
    stats.value = resp.data || resp
  } catch {
    Message.error('获取监控数据失败')
  }
})
</script>
