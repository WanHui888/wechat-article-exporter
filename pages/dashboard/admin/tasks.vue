<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">任务管理</h1>
      <p class="text-muted-foreground mt-1">查看和管理定时任务</p>
    </div>

    <div class="rounded-lg border border-border bg-background overflow-hidden">
      <a-table :data="tasks" :loading="loading" :bordered="false" row-key="id">
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="60" />
          <a-table-column title="类型" data-index="type" :width="100" />
          <a-table-column title="间隔(小时)" data-index="intervalHours" :width="100" />
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'running' ? 'blue' : record.status === 'error' ? 'red' : 'green'">
                {{ record.status }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="启用" :width="80">
            <template #cell="{ record }">
              <a-switch :model-value="record.enabled" size="small" @change="toggleTask(record)" />
            </template>
          </a-table-column>
          <a-table-column title="上次运行" :width="160">
            <template #cell="{ record }">
              {{ record.lastRunAt ? new Date(record.lastRunAt).toLocaleString('zh-CN') : '-' }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="100">
            <template #cell="{ record }">
              <a-button
                type="text"
                size="mini"
                :disabled="record.status === 'running'"
                @click="runTask(record)"
              >
                立即执行
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

const tasks = ref<any[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const resp = await $fetch<any>('/api/admin/tasks')
    tasks.value = resp.data || resp || []
  } catch {
    Message.error('加载失败')
  } finally {
    loading.value = false
  }
})

async function toggleTask(record: any) {
  try {
    await $fetch('/api/admin/tasks/toggle', {
      method: 'PUT',
      body: { taskId: record.id, enabled: !record.enabled },
    })
    record.enabled = !record.enabled
    Message.success('操作成功')
  } catch {
    Message.error('操作失败')
  }
}

async function runTask(record: any) {
  try {
    record.status = 'running'
    await $fetch('/api/admin/tasks/run', {
      method: 'POST',
      body: { taskId: record.id },
    })
    Message.success('任务已触发')
  } catch {
    Message.error('触发失败')
    record.status = 'idle'
  }
}
</script>
