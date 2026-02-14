import { ref, computed } from 'vue'
import { PUBLIC_PROXY_LIST } from '~/config/public-proxy'

export interface ProxyNode {
  url: string
  type: 'public' | 'private'
  status: 'idle' | 'testing' | 'ok' | 'error'
  latency?: number
}

const publicNodes = ref<ProxyNode[]>(
  PUBLIC_PROXY_LIST.map(url => ({ url, type: 'public' as const, status: 'idle' as const }))
)
const privateNodes = ref<ProxyNode[]>([])
const currentIp = ref('')

export function useProxyManager() {
  const allProxies = computed(() => [...privateNodes.value, ...publicNodes.value])

  async function fetchCurrentIp() {
    try {
      const resp = await $fetch<any>('/api/web/misc/current-ip', {
        headers: getHeaders(),
      })
      currentIp.value = resp?.ip || resp?.data?.ip || ''
    } catch {
      currentIp.value = '获取失败'
    }
  }

  function setPrivateProxies(urls: string[]) {
    privateNodes.value = urls
      .map(u => u.trim())
      .filter(u => u && /^https?:\/\//.test(u))
      .map(url => ({ url, type: 'private' as const, status: 'idle' as const }))
  }

  function getPrivateProxyUrls(): string[] {
    return privateNodes.value.map(n => n.url)
  }

  async function testProxy(node: ProxyNode) {
    node.status = 'testing'
    const start = Date.now()

    try {
      const testUrl = `${node.url}/?url=${encodeURIComponent('https://mp.weixin.qq.com')}`
      const resp = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      })

      if (resp.ok || resp.status === 301 || resp.status === 302) {
        node.status = 'ok'
        node.latency = Date.now() - start
      } else {
        node.status = 'error'
      }
    } catch {
      node.status = 'error'
    }
  }

  function getHeaders(): Record<string, string> {
    if (import.meta.server) return {}
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return {
    publicNodes,
    privateNodes,
    currentIp,
    allProxies,
    fetchCurrentIp,
    setPrivateProxies,
    getPrivateProxyUrls,
    testProxy,
  }
}
