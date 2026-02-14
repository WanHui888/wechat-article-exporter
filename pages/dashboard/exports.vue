<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">导出任务</h1>
      <p class="text-muted-foreground mt-1">查看和管理文章导出任务</p>
    </div>

    <div class="rounded-lg border border-border bg-background overflow-hidden">
      <a-table :data="jobs" :loading="loading" :bordered="false" row-key="id">
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="80" />
          <a-table-column title="格式" :width="100">
            <template #cell="{ record }">
              <a-tag>{{ record.format.toUpperCase() }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="进度" :width="150">
            <template #cell="{ record }">
              <a-progress :percent="record.total ? Math.round(record.progress / record.total * 100) : 0" size="small" />
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="创建时间" :width="160">
            <template #cell="{ record }">
              {{ new Date(record.createdAt).toLocaleString('zh-CN') }}
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-if="record.status === 'completed'"
                  type="text"
                  size="mini"
                  @click="downloadExport(record.id)"
                >下载</a-button>
                <a-button type="text" size="mini" status="danger" @click="deleteJob(record.id)">
                  删除
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
import { Message } from '@arco-design/web-vue'
import { apiGetExportJobs, apiDeleteExportJob, getExportDownloadUrl } from '~/apis/data'
import type { ExportJob } from '~/types'

const jobs = ref<ExportJob[]>([])
const loading = ref(false)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    jobs.value = await apiGetExportJobs()
  } catch {
    Message.error('加载失败')
  } finally {
    loading.value = false
  }
}

function statusColor(status: string) {
  const map: Record<string, string> = { pending: 'orangered', processing: 'blue', completed: 'green', failed: 'red' }
  return map[status] || ''
}

function statusLabel(status: string) {
  const map: Record<string, string> = { pending: '等待中', processing: '处理中', completed: '已完成', failed: '失败' }
  return map[status] || status
}

function downloadExport(id: number) {
  window.open(getExportDownloadUrl(id), '_blank')
}

async function deleteJob(id: number) {
  try {
    await apiDeleteExportJob(id)
    jobs.value = jobs.value.filter(j => j.id !== id)
    Message.success('删除成功')
  } catch {
    Message.error('删除失败')
  }
}
</script>
