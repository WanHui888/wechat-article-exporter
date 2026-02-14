<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-foreground">操作历史</h1>
      <p class="text-muted-foreground mt-1">查看操作日志记录</p>
    </div>

    <div class="flex gap-3">
      <a-select v-model="actionFilter" placeholder="筛选操作类型" allow-clear style="width: 160px" @change="loadData">
        <a-option value="sync">同步</a-option>
        <a-option value="download">下载</a-option>
        <a-option value="export">导出</a-option>
        <a-option value="login">登录</a-option>
        <a-option value="delete">删除</a-option>
      </a-select>
    </div>

    <div class="rounded-lg border border-border bg-background overflow-hidden">
      <a-table
        :data="logs"
        :loading="loading"
        :pagination="{ total, current: page, pageSize }"
        :bordered="false"
        row-key="id"
        @page-change="handlePageChange"
      >
        <template #columns>
          <a-table-column title="操作" data-index="action" :width="100" />
          <a-table-column title="目标类型" data-index="targetType" :width="100" />
          <a-table-column title="目标ID" data-index="targetId" :width="150" ellipsis />
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'success' ? 'green' : 'red'" size="small">
                {{ record.status === 'success' ? '成功' : '失败' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="时间" :width="160">
            <template #cell="{ record }">
              {{ new Date(record.createdAt).toLocaleString('zh-CN') }}
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { apiGetLogs } from '~/apis/data'
import type { OperationLog } from '~/types'

const logs = ref<OperationLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const loading = ref(false)
const actionFilter = ref<string>()

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const result = await apiGetLogs({
      page: page.value,
      pageSize: pageSize.value,
      action: actionFilter.value,
    })
    logs.value = result.items
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
</script>
