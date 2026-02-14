<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">公众号管理</h1>
        <p class="text-muted-foreground mt-1">搜索、添加和管理公众号</p>
      </div>
    </div>

    <!-- Search bar -->
    <div class="flex gap-3">
      <a-input-search
        v-model="searchKeyword"
        placeholder="搜索公众号名称或粘贴文章链接"
        search-button
        allow-clear
        class="flex-1"
        @search="handleSearch"
        @press-enter="handleSearch"
      />
    </div>

    <!-- Search results -->
    <div v-if="searchResults.length > 0" class="rounded-lg border border-border bg-background p-4">
      <h3 class="font-medium text-foreground mb-3">搜索结果</h3>
      <div class="space-y-2">
        <div
          v-for="item in searchResults"
          :key="item.fakeid"
          class="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
        >
          <a-avatar :size="48" :image-url="item.round_head_img">
            {{ item.nickname?.[0] }}
          </a-avatar>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-foreground">{{ item.nickname }}</div>
            <div class="text-sm text-muted-foreground truncate">{{ item.signature || '暂无简介' }}</div>
          </div>
          <a-button type="primary" size="small" @click="handleAdd(item)">
            添加
          </a-button>
        </div>
      </div>
    </div>

    <!-- Account list -->
    <div class="rounded-lg border border-border bg-background">
      <div class="p-4 border-b border-border">
        <h3 class="font-medium text-foreground">已添加 ({{ accounts.length }})</h3>
      </div>
      <div v-if="accounts.length === 0" class="p-8 text-center text-muted-foreground">
        暂无公众号，请搜索并添加
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="account in accounts"
          :key="account.fakeid"
          class="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <a-avatar :size="48" :image-url="account.roundHeadImg || undefined">
            {{ account.nickname?.[0] || '?' }}
          </a-avatar>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-foreground">{{ account.nickname }}</div>
            <div class="text-sm text-muted-foreground">
              已同步 {{ account.syncedCount }} 篇
              <span v-if="account.completed" class="text-green-500 ml-2">已完成</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <a-button size="small" @click="navigateTo('/dashboard/article?fakeid=' + account.fakeid)">
              文章列表
            </a-button>
            <a-popconfirm content="确定删除该公众号及其所有数据？" @ok="handleDelete(account.fakeid)">
              <a-button size="small" status="danger" type="text">
                <template #icon><icon-delete /></template>
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconDelete } from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import { getAccountList, searchByUrl } from '~/apis'

const { accounts, loadAccounts, addAccount, removeAccount } = useDataStore()
const searchKeyword = ref('')
const searchResults = ref<any[]>([])

onMounted(() => {
  loadAccounts()
})

async function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  try {
    let resp: any
    if (keyword.startsWith('http')) {
      resp = await searchByUrl(keyword)
    } else {
      resp = await getAccountList(0, keyword, 10)
    }

    if (resp.base_resp?.ret === 0 && resp.list) {
      searchResults.value = resp.list
    } else {
      Message.warning(resp.base_resp?.err_msg || '搜索失败')
      searchResults.value = []
    }
  } catch {
    Message.error('搜索失败，请检查微信登录状态')
  }
}

async function handleAdd(item: any) {
  try {
    await addAccount({
      fakeid: item.fakeid,
      nickname: item.nickname,
      alias: item.alias,
      roundHeadImg: item.round_head_img,
      serviceType: item.service_type,
      signature: item.signature,
    })
    Message.success('添加成功')
  } catch {
    Message.error('添加失败')
  }
}

async function handleDelete(fakeid: string) {
  try {
    await removeAccount(fakeid)
    Message.success('删除成功')
  } catch {
    Message.error('删除失败')
  }
}
</script>
