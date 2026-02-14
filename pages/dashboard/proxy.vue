<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-foreground">代理管理</h1>
      <p class="text-muted-foreground mt-1">管理 Cloudflare Workers 代理节点</p>
    </div>

    <!-- Current IP -->
    <div class="rounded-lg border border-border bg-background p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-foreground">当前 IP</h3>
          <p class="text-lg font-mono text-foreground mt-1">{{ currentIp || '...' }}</p>
        </div>
        <a-button size="small" @click="fetchCurrentIp">刷新</a-button>
      </div>
    </div>

    <!-- Private Proxies -->
    <div class="rounded-lg border border-border bg-background p-6">
      <h3 class="text-sm font-medium text-foreground mb-3">私有代理节点</h3>
      <p class="text-xs text-muted-foreground mb-3">
        每行填写一个代理地址，必须以 http:// 或 https:// 开头
      </p>
      <a-textarea
        v-model="privateProxyText"
        placeholder="https://my-proxy.example.com&#10;https://my-proxy-2.example.com"
        :auto-size="{ minRows: 3, maxRows: 8 }"
      />
      <div class="flex items-center gap-2 mt-3">
        <a-button type="primary" size="small" :loading="saving" @click="savePrivateProxies">
          保存
        </a-button>
        <span v-if="saveMsg" class="text-xs text-green-600">{{ saveMsg }}</span>
      </div>
    </div>

    <!-- Public Proxies -->
    <div class="rounded-lg border border-border bg-background p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-medium text-foreground">公共代理节点</h3>
          <p class="text-xs text-muted-foreground mt-1">
            共 {{ publicNodes.length }} 个节点
            <span v-if="testedCount > 0">
              ，已测试 {{ testedCount }} 个
              (可用 <span class="text-green-600">{{ okCount }}</span> /
              不可用 <span class="text-red-600">{{ errorCount }}</span>)
            </span>
          </p>
        </div>
        <a-button size="small" :loading="batchTesting" @click="batchTestPublic">
          批量测试
        </a-button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        <div
          v-for="node in publicNodes"
          :key="node.url"
          class="flex items-center justify-between px-3 py-2 rounded border text-xs font-mono"
          :class="{
            'border-border': node.status === 'idle',
            'border-blue-300 bg-blue-50': node.status === 'testing',
            'border-green-300 bg-green-50': node.status === 'ok',
            'border-red-300 bg-red-50': node.status === 'error',
          }"
        >
          <span class="truncate mr-2">{{ extractDomain(node.url) }}</span>
          <span v-if="node.status === 'testing'" class="text-blue-500 flex-shrink-0">
            <icon-loading class="animate-spin" />
          </span>
          <span v-else-if="node.status === 'ok'" class="text-green-600 flex-shrink-0">
            {{ node.latency }}ms
          </span>
          <span v-else-if="node.status === 'error'" class="text-red-500 flex-shrink-0">
            失败
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { IconLoading } from '@arco-design/web-vue/es/icon'

const {
  publicNodes,
  privateNodes,
  currentIp,
  fetchCurrentIp,
  setPrivateProxies,
  getPrivateProxyUrls,
  testProxy,
} = useProxyManager()

const { preferences, loadPreferences, updatePreferences } = usePreferences()

const privateProxyText = ref('')
const saving = ref(false)
const saveMsg = ref('')
const batchTesting = ref(false)

const testedCount = computed(() =>
  publicNodes.value.filter(n => n.status !== 'idle').length
)
const okCount = computed(() =>
  publicNodes.value.filter(n => n.status === 'ok').length
)
const errorCount = computed(() =>
  publicNodes.value.filter(n => n.status === 'error').length
)

onMounted(async () => {
  fetchCurrentIp()
  await loadPreferences()
  const saved = (preferences.value as any)?.privateProxies as string[] | undefined
  if (saved && Array.isArray(saved)) {
    setPrivateProxies(saved)
    privateProxyText.value = saved.join('\n')
  }
})

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

async function savePrivateProxies() {
  saving.value = true
  saveMsg.value = ''
  try {
    const urls = privateProxyText.value
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && /^https?:\/\//.test(l))

    setPrivateProxies(urls)
    await updatePreferences({ privateProxies: urls } as any)
    saveMsg.value = '已保存'
    setTimeout(() => { saveMsg.value = '' }, 2000)
  } catch (e: any) {
    Message.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function batchTestPublic() {
  batchTesting.value = true
  // Reset all to idle first
  publicNodes.value.forEach(n => { n.status = 'idle'; n.latency = undefined })

  // Test in batches of 10 to avoid overwhelming the network
  const batchSize = 10
  for (let i = 0; i < publicNodes.value.length; i += batchSize) {
    const batch = publicNodes.value.slice(i, i + batchSize)
    await Promise.all(batch.map(node => testProxy(node)))
  }
  batchTesting.value = false
  Message.info(`测试完成: ${okCount.value} 个可用, ${errorCount.value} 个不可用`)
}
</script>
