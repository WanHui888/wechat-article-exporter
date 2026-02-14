import { ref, computed } from 'vue'
import type { MpAccount, Article, PaginatedResponse } from '~/types'
import {
  apiGetAccounts, apiUpsertAccount, apiDeleteAccount,
  apiGetArticles, apiUpsertArticles, apiGetArticleCount,
  apiGetDownloadedHtmlUrls, apiGetDownloadedMetadataUrls,
  apiGetDownloadedCommentUrls, apiUpdateSyncProgress,
} from '~/apis/data'

// Shared state
const accounts = ref<MpAccount[]>([])
const currentFakeid = ref<string>('')
const articleCache = new Map<string, PaginatedResponse<Article>>()

export function useDataStore() {
  const currentAccount = computed(() =>
    accounts.value.find(a => a.fakeid === currentFakeid.value) || null
  )

  async function loadAccounts() {
    accounts.value = await apiGetAccounts()
    return accounts.value
  }

  async function addAccount(data: Partial<MpAccount>) {
    const account = await apiUpsertAccount(data)
    const idx = accounts.value.findIndex(a => a.fakeid === data.fakeid)
    if (idx >= 0) {
      accounts.value[idx] = account
    } else {
      accounts.value.unshift(account)
    }
    return account
  }

  async function removeAccount(fakeid: string) {
    await apiDeleteAccount(fakeid)
    accounts.value = accounts.value.filter(a => a.fakeid !== fakeid)
    articleCache.delete(fakeid)
    if (currentFakeid.value === fakeid) {
      currentFakeid.value = ''
    }
  }

  function selectAccount(fakeid: string) {
    currentFakeid.value = fakeid
  }

  async function loadArticles(fakeid: string, options?: {
    page?: number; pageSize?: number; keyword?: string
  }) {
    return apiGetArticles(fakeid, options)
  }

  async function saveArticles(articles: any[]) {
    await apiUpsertArticles(articles)
  }

  async function getArticleCount(fakeid: string) {
    return apiGetArticleCount(fakeid)
  }

  async function getDownloadedHtmlUrls(fakeid: string) {
    return apiGetDownloadedHtmlUrls(fakeid)
  }

  async function getDownloadedMetadataUrls(fakeid: string) {
    return apiGetDownloadedMetadataUrls(fakeid)
  }

  async function getDownloadedCommentUrls(fakeid: string) {
    return apiGetDownloadedCommentUrls(fakeid)
  }

  async function updateSyncProgress(fakeid: string, data: Record<string, any>) {
    await apiUpdateSyncProgress(fakeid, data)
    const idx = accounts.value.findIndex(a => a.fakeid === fakeid)
    if (idx >= 0) {
      Object.assign(accounts.value[idx]!, data)
    }
  }

  return {
    accounts,
    currentFakeid,
    currentAccount,
    loadAccounts,
    addAccount,
    removeAccount,
    selectAccount,
    loadArticles,
    saveArticles,
    getArticleCount,
    getDownloadedHtmlUrls,
    getDownloadedMetadataUrls,
    getDownloadedCommentUrls,
    updateSyncProgress,
  }
}
