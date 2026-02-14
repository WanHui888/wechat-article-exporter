import type {
  MpAccount, Article, ArticleHtml, ArticleMetadata,
  ArticleComment, Resource, ResourceMap, UserPreferencesData,
  Credential, PaginatedResponse, ExportJob, ExportFormat,
  OperationLog,
} from '~/types'

const API = '/api/data'

function getAuthHeaders(): Record<string, string> {
  if (import.meta.server) return {}
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function makeRequest<T>(url: string, options?: any): Promise<T> {
  return $fetch<{ success: boolean; data: T }>(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  }).then(r => r.data)
}

// ==================== Accounts ====================
export const apiGetAccounts = () => makeRequest<MpAccount[]>(`${API}/accounts`)

export const apiUpsertAccount = (data: Partial<MpAccount>) =>
  makeRequest<MpAccount>(`${API}/accounts`, { method: 'POST', body: data })

export const apiDeleteAccount = (fakeid: string) =>
  makeRequest<void>(`${API}/accounts`, { method: 'DELETE', body: { fakeid } })

export const apiUpdateSyncProgress = (fakeid: string, data: Record<string, any>) =>
  makeRequest<void>(`${API}/accounts-sync`, { method: 'POST', body: { fakeid, ...data } })

export const apiSetAutoSync = (fakeid: string, autoSync: boolean, interval?: number) =>
  makeRequest<void>(`${API}/accounts-auto-sync`, { method: 'POST', body: { fakeid, autoSync, interval } })

export const apiImportAccounts = (accounts: any[]) =>
  makeRequest<MpAccount[]>(`${API}/accounts-import`, { method: 'POST', body: { accounts } })

// ==================== Articles ====================
export const apiGetArticles = (fakeid: string, options?: {
  page?: number; pageSize?: number; keyword?: string
  startTime?: number; endTime?: number
}) => makeRequest<PaginatedResponse<Article>>(`${API}/articles`, {
  params: { fakeid, ...options },
})

export const apiUpsertArticles = (articles: any[]) =>
  makeRequest<void>(`${API}/articles`, { method: 'POST', body: { articles } })

export const apiGetArticleCount = (fakeid: string) =>
  makeRequest<number>(`${API}/articles-count`, { params: { fakeid } })

export const apiGetArticleUrls = (fakeid: string) =>
  makeRequest<string[]>(`${API}/articles-urls`, { params: { fakeid } })

export const apiToggleFavorite = (articleId: number, favorited: boolean) =>
  makeRequest<void>(`${API}/articles-favorite`, { method: 'POST', body: { articleId, favorited } })

export const apiGetFavoritedArticles = (page?: number, pageSize?: number) =>
  makeRequest<PaginatedResponse<Article>>(`${API}/articles-favorited`, {
    params: { page, pageSize },
  })

// ==================== HTML ====================
export const apiGetHtml = (url: string) =>
  makeRequest<ArticleHtml | null>(`${API}/html`, { params: { url } })

export const apiSaveHtml = (data: {
  fakeid: string; articleUrl: string; title: string
  commentId?: string; content: string
}) => makeRequest<void>(`${API}/html`, { method: 'POST', body: data })

export const apiGetDownloadedHtmlUrls = (fakeid: string) =>
  makeRequest<string[]>(`${API}/html-downloaded`, { params: { fakeid } })

export const apiGetDownloadedHtmlCount = (fakeid: string) =>
  makeRequest<number>(`${API}/html-count`, { params: { fakeid } })

// ==================== Metadata ====================
export const apiGetMetadata = (url: string) =>
  makeRequest<ArticleMetadata | null>(`${API}/metadata`, { params: { url } })

export const apiSaveMetadata = (data: any) =>
  makeRequest<void>(`${API}/metadata`, { method: 'POST', body: data })

export const apiGetDownloadedMetadataUrls = (fakeid: string) =>
  makeRequest<string[]>(`${API}/metadata-downloaded`, { params: { fakeid } })

// ==================== Comments ====================
export const apiGetComment = (url: string) =>
  makeRequest<ArticleComment | null>(`${API}/comments`, { params: { url } })

export const apiSaveComment = (data: any) =>
  makeRequest<void>(`${API}/comments`, { method: 'POST', body: data })

export const apiGetDownloadedCommentUrls = (fakeid: string) =>
  makeRequest<string[]>(`${API}/comments-downloaded`, { params: { fakeid } })

export const apiSaveCommentReply = (data: any) =>
  makeRequest<void>(`${API}/comment-replies`, { method: 'POST', body: data })

// ==================== Resources ====================
export const apiGetResource = (url: string) =>
  makeRequest<Resource | null>(`${API}/resources`, { params: { url } })

export const apiSaveResource = (data: any) =>
  makeRequest<{ filePath: string }>(`${API}/resources`, { method: 'POST', body: data })

export const apiGetResourceMap = (url: string) =>
  makeRequest<ResourceMap | null>(`${API}/resource-map`, { params: { url } })

export const apiSaveResourceMap = (data: any) =>
  makeRequest<void>(`${API}/resource-map`, { method: 'POST', body: data })

// ==================== Preferences ====================
export const apiGetPreferences = () =>
  makeRequest<UserPreferencesData>(`${API}/preferences`)

export const apiUpdatePreferences = (data: Partial<UserPreferencesData>) =>
  makeRequest<UserPreferencesData>(`${API}/preferences`, { method: 'PUT', body: data })

// ==================== Credentials ====================
export const apiGetCredentials = () =>
  makeRequest<Credential[]>(`${API}/credentials`)

export const apiSaveCredential = (data: any) =>
  makeRequest<void>(`${API}/credentials`, { method: 'POST', body: data })

export const apiDeleteCredential = (biz: string) =>
  makeRequest<void>(`${API}/credentials`, { method: 'DELETE', body: { biz } })

// ==================== Logs ====================
export const apiGetLogs = (options?: { page?: number; pageSize?: number; action?: string }) =>
  makeRequest<PaginatedResponse<OperationLog>>(`${API}/logs`, { params: options })

// ==================== Storage ====================
export const apiGetStorage = () =>
  makeRequest<{ used: number; quota: number; percent: number }>(`${API}/storage`)

// ==================== Export ====================
export const apiCreateExportJob = (format: ExportFormat, articleUrls: string[], fakeid?: string) =>
  makeRequest<{ id: number }>('/api/export/create', {
    method: 'POST',
    body: { format, articleUrls, fakeid },
  })

export const apiGetExportJobs = () =>
  makeRequest<ExportJob[]>('/api/export/jobs')

export const apiGetExportJob = (id: number) =>
  makeRequest<ExportJob>(`/api/export/${id}`)

export const apiDeleteExportJob = (id: number) =>
  makeRequest<void>(`/api/export/${id}`, { method: 'DELETE' })

export function getExportDownloadUrl(id: number): string {
  return `/api/export/download/${id}`
}
