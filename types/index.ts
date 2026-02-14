// ==================== User Types ====================
export interface User {
  id: number
  username: string
  email?: string | null
  nickname?: string | null
  avatar?: string | null
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
  storageQuota: number
  storageUsed: number
  createdAt: string
  lastLoginAt?: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email?: string
  nickname?: string
}

export interface AuthResponse {
  token: string
  user: User
}

// ==================== WeChat Session Types ====================
export interface WeChatSession {
  id: number
  userId: number
  authKey: string
  token: string
  cookies: Record<string, string>
  mpNickname?: string | null
  mpAvatar?: string | null
  expiresAt: string
}

// ==================== MP Account Types ====================
export interface MpAccount {
  id: number
  userId: number
  fakeid: string
  nickname?: string | null
  alias?: string | null
  roundHeadImg?: string | null
  serviceType?: number
  signature?: string | null
  totalCount: number
  syncedCount: number
  syncedArticles: number
  completed: boolean
  autoSync: boolean
  syncInterval: number
  lastSyncAt?: string | null
  createdAt: string
}

// ==================== Article Types ====================
export interface Article {
  id: number
  userId: number
  fakeid: string
  aid: string
  title: string
  link: string
  cover?: string | null
  digest?: string | null
  authorName?: string | null
  createTime?: number | null
  updateTime?: number | null
  appmsgid?: number | null
  itemidx?: number | null
  itemShowType: number
  copyrightStat?: number | null
  copyrightType?: number | null
  isDeleted: boolean
  isPaySubscribe: number
  isFavorited: boolean
  albumId?: string | null
  appmsgAlbumInfos?: any | null
  mediaDuration?: string | null
  status: string
  isSingle: boolean
  extraData?: any | null
  createdAt: string
}

export interface ArticleHtml {
  id: number
  userId: number
  fakeid: string
  articleUrl: string
  title: string
  commentId?: string | null
  filePath: string
  fileSize: number
  createdAt: string
}

export interface ArticleMetadata {
  id: number
  userId: number
  fakeid: string
  articleUrl: string
  title: string
  readNum: number
  oldLikeNum: number
  shareNum: number
  likeNum: number
  commentNum: number
  createdAt: string
}

export interface ArticleComment {
  id: number
  userId: number
  fakeid: string
  articleUrl: string
  title: string
  data: any
  createdAt: string
}

// ==================== Resource Types ====================
export interface Resource {
  id: number
  userId: number
  fakeid: string
  resourceUrl: string
  filePath: string
  fileSize: number
  mimeType?: string | null
}

export interface ResourceMap {
  id: number
  userId: number
  fakeid: string
  articleUrl: string
  resources: Record<string, string>
}

// ==================== Credential Types ====================
export interface Credential {
  id: number
  userId: number
  biz: string
  uin: string
  key: string
  passTicket: string
  wapSid2?: string | null
  nickname?: string | null
  avatar?: string | null
  timestamp: number
  valid: boolean
}

// ==================== Export Types ====================
export type ExportFormat = 'html' | 'excel' | 'json' | 'txt' | 'markdown' | 'word'

export interface ExportJob {
  id: number
  userId: number
  format: ExportFormat
  fakeid?: string | null
  articleUrls: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total: number
  filePath?: string | null
  fileSize?: number | null
  error?: string | null
  expiresAt?: string | null
  createdAt: string
  completedAt?: string | null
}

export interface CreateExportRequest {
  format: ExportFormat
  fakeid?: string
  articleUrls: string[]
}

// ==================== Favorites Types ====================
export interface Favorite {
  id: number
  userId: number
  articleId: number
  note?: string | null
  createdAt: string
  article?: Article
}

// ==================== Operation Log Types ====================
export interface OperationLog {
  id: number
  userId: number
  action: string
  targetType?: string | null
  targetId?: string | null
  detail?: any
  status: 'success' | 'failed' | 'pending'
  createdAt: string
}

// ==================== Scheduled Task Types ====================
export interface ScheduledTask {
  id: number
  userId: number
  type: 'sync' | 'download' | 'cleanup'
  targetFakeid?: string | null
  intervalHours: number
  enabled: boolean
  lastRunAt?: string | null
  nextRunAt?: string | null
  status: 'idle' | 'running' | 'error'
  lastError?: string | null
  config?: any
}

// ==================== Preferences Types ====================
export interface UserPreferencesData {
  theme?: 'light' | 'dark' | 'system'
  downloadConcurrency?: number
  autoDownload?: boolean
  exportFormat?: ExportFormat
  syncInterval?: number
  notificationsEnabled?: boolean
  [key: string]: any
}

// ==================== API Response Types ====================
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ==================== Proxy Types ====================
export interface ProxyNode {
  id: string
  name: string
  url: string
  enabled: boolean
  priority: number
  lastCheckAt?: string
  status?: 'online' | 'offline' | 'unknown'
}

// ==================== System Monitor Types ====================
export interface SystemStats {
  cpu: number
  memory: { used: number; total: number; percent: number }
  disk: { used: number; total: number; percent: number }
  uptime: number
  userCount: number
  articleCount: number
  storageUsed: number
}
