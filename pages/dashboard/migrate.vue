<script setup lang="ts">
import Dexie from 'dexie'
import { ref } from 'vue'
import toastFactory from '~/composables/toast'
import { websiteName } from '~/config'

useHead({ title: `数据迁移 | ${websiteName}` })

const toast = toastFactory()

interface TableStatus {
  name: string
  label: string
  total: number
  imported: number
  failed: number
  status: 'pending' | 'running' | 'done' | 'error'
}

const tables: TableStatus[] = reactive([
  { name: 'article', label: '文章', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'html', label: 'HTML内容', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'comment', label: '评论', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'comment_reply', label: '评论回复', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'metadata', label: '元数据', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'info', label: '公众号信息', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'resource', label: '图片资源', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'resource-map', label: '资源映射', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'asset', label: 'Asset', total: 0, imported: 0, failed: 0, status: 'pending' },
  { name: 'debug', label: '调试数据', total: 0, imported: 0, failed: 0, status: 'pending' },
])

const isRunning = ref(false)
const isDone = ref(false)

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function migrateTable(db: Dexie, tableStatus: TableStatus) {
  tableStatus.status = 'running'
  const BATCH_SIZE = 20

  try {
    const tableName = tableStatus.name
    // Access the Dexie table (resource-map uses bracket notation)
    const dexieTable = (db as any)[tableName === 'resource-map' ? 'resource-map' : tableName]
    const allRows: any[] = await dexieTable.toArray()
    tableStatus.total = allRows.length

    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE)

      // Serialize Blob fields to base64
      const serialized = await Promise.all(
        batch.map(async (row: any) => {
          const r = { ...row }
          if (r.file instanceof Blob) {
            r.file = await blobToBase64(r.file)
          }
          return r
        }),
      )

      const result = await $fetch<{ imported: number; failed: number }>('/api/store/migrate', {
        method: 'POST',
        body: { table: tableName, rows: serialized },
      })

      tableStatus.imported += result.imported
      tableStatus.failed += result.failed
    }

    tableStatus.status = 'done'
  } catch (e: any) {
    tableStatus.status = 'error'
    tableStatus.failed = tableStatus.total - tableStatus.imported
  }
}

async function startMigration() {
  if (isRunning.value) return
  isRunning.value = true
  isDone.value = false

  // Reset all statuses
  for (const t of tables) {
    t.total = 0
    t.imported = 0
    t.failed = 0
    t.status = 'pending'
  }

  try {
    const db = new Dexie('exporter.wxdown.online')
    db.version(3).stores({
      api: '++, name, account, call_time',
      article: ', fakeid, create_time, link',
      asset: 'url, fakeid',
      comment: 'url, fakeid',
      comment_reply: ', url, contentID, fakeid',
      debug: 'url, fakeid',
      html: 'url, fakeid',
      info: 'fakeid',
      metadata: 'url, fakeid',
      resource: 'url, fakeid',
      'resource-map': 'url, fakeid',
    })

    for (const tableStatus of tables) {
      await migrateTable(db, tableStatus)
    }

    toast.success('迁移完成', '所有数据已从浏览器迁移到本地 SQLite')
  } catch (e: any) {
    toast.error('迁移失败', e.message)
  } finally {
    isRunning.value = false
    isDone.value = true
  }
}

const totalImported = computed(() => tables.reduce((sum, t) => sum + t.imported, 0))
const totalFailed = computed(() => tables.reduce((sum, t) => sum + t.failed, 0))
</script>

<template>
  <div class="h-full overflow-auto p-6">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">数据迁移</h1>
    </Teleport>

    <div class="max-w-2xl mx-auto">
      <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 class="font-semibold text-blue-800 dark:text-blue-300 mb-2">说明</h2>
        <p class="text-sm text-blue-700 dark:text-blue-400">
          此工具将把浏览器 IndexedDB 中存储的所有数据（文章、HTML内容、评论、图片等）迁移到本地 SQLite 文件。
          迁移完成后，数据将永久保存在本地磁盘，不再依赖浏览器存储。
        </p>
      </div>

      <div class="space-y-3 mb-6">
        <div
          v-for="table in tables"
          :key="table.name"
          class="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div class="w-6 flex-shrink-0 text-center">
            <span v-if="table.status === 'pending'" class="text-gray-400">○</span>
            <span v-else-if="table.status === 'running'" class="text-blue-500 animate-spin inline-block">↻</span>
            <span v-else-if="table.status === 'done'" class="text-green-500">✓</span>
            <span v-else-if="table.status === 'error'" class="text-red-500">✗</span>
          </div>
          <div class="flex-1">
            <span class="font-medium">{{ table.label }}</span>
            <span class="text-sm text-gray-500 ml-2">（{{ table.name }}）</span>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 font-mono">
            <template v-if="table.status !== 'pending'">
              {{ table.imported }} / {{ table.total }}
              <span v-if="table.failed > 0" class="text-red-500 ml-1">（失败 {{ table.failed }}）</span>
            </template>
            <template v-else>
              --
            </template>
          </div>
        </div>
      </div>

      <div v-if="isDone" class="mb-4 p-3 rounded-lg" :class="totalFailed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'">
        <p class="text-sm font-medium" :class="totalFailed > 0 ? 'text-yellow-800' : 'text-green-800'">
          迁移完成：成功 {{ totalImported }} 条，失败 {{ totalFailed }} 条
        </p>
      </div>

      <UButton
        :loading="isRunning"
        :disabled="isRunning"
        color="blue"
        size="lg"
        class="w-full justify-center"
        @click="startMigration"
      >
        {{ isRunning ? '正在迁移...' : (isDone ? '重新迁移' : '开始迁移') }}
      </UButton>
    </div>
  </div>
</template>
