import { mysqlTable, varchar, int, bigint, tinyint, text, datetime, json, mysqlEnum, uniqueIndex, index } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'

// ==================== users ====================
export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 100 }).unique(),
  nickname: varchar('nickname', { length: 50 }),
  avatar: varchar('avatar', { length: 500 }),
  role: mysqlEnum('role', ['user', 'admin']).notNull().default('user'),
  status: mysqlEnum('status', ['active', 'disabled']).notNull().default('active'),
  storageQuota: bigint('storage_quota', { mode: 'number' }).notNull().default(5368709120),
  storageUsed: bigint('storage_used', { mode: 'number' }).notNull().default(0),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').default(sql`NULL ON UPDATE CURRENT_TIMESTAMP`),
  lastLoginAt: datetime('last_login_at'),
})

// ==================== wechat_sessions ====================
export const wechatSessions = mysqlTable('wechat_sessions', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authKey: varchar('auth_key', { length: 64 }).notNull().unique(),
  token: varchar('token', { length: 255 }).notNull(),
  cookies: json('cookies').notNull(),
  mpNickname: varchar('mp_nickname', { length: 100 }),
  mpAvatar: varchar('mp_avatar', { length: 500 }),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_user_id').on(table.userId),
])

// ==================== mp_accounts ====================
export const mpAccounts = mysqlTable('mp_accounts', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  nickname: varchar('nickname', { length: 100 }),
  alias: varchar('alias', { length: 100 }),
  roundHeadImg: varchar('round_head_img', { length: 500 }),
  serviceType: int('service_type').default(0),
  signature: text('signature'),
  totalCount: int('total_count').notNull().default(0),
  syncedCount: int('synced_count').notNull().default(0),
  syncedArticles: int('synced_articles').notNull().default(0),
  completed: tinyint('completed').notNull().default(0),
  autoSync: tinyint('auto_sync').notNull().default(0),
  syncInterval: int('sync_interval').default(24),
  lastSyncAt: datetime('last_sync_at'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').default(sql`NULL ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uk_user_fakeid').on(table.userId, table.fakeid),
])

// ==================== articles ====================
export const articles = mysqlTable('articles', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  aid: varchar('aid', { length: 50 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  link: varchar('link', { length: 1000 }).notNull(),
  cover: varchar('cover', { length: 500 }),
  digest: text('digest'),
  authorName: varchar('author_name', { length: 100 }),
  createTime: int('create_time'),
  updateTime: int('update_time'),
  appmsgid: bigint('appmsgid', { mode: 'number' }),
  itemidx: int('itemidx'),
  itemShowType: int('item_show_type').notNull().default(0),
  copyrightStat: int('copyright_stat'),
  copyrightType: int('copyright_type'),
  isDeleted: tinyint('is_deleted').notNull().default(0),
  isPaySubscribe: int('is_pay_subscribe').notNull().default(0),
  isFavorited: tinyint('is_favorited').notNull().default(0),
  albumId: varchar('album_id', { length: 50 }),
  appmsgAlbumInfos: json('appmsg_album_infos'),
  mediaDuration: varchar('media_duration', { length: 20 }),
  status: varchar('status', { length: 50 }).notNull().default(''),
  isSingle: tinyint('is_single').notNull().default(0),
  extraData: json('extra_data'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uk_user_fakeid_aid').on(table.userId, table.fakeid, table.aid),
  index('idx_user_fakeid_time').on(table.userId, table.fakeid, table.createTime),
  index('idx_user_favorite').on(table.userId, table.isFavorited),
])

// ==================== article_html ====================
export const articleHtml = mysqlTable('article_html', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  articleUrl: varchar('article_url', { length: 1000 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  commentId: varchar('comment_id', { length: 100 }),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ==================== article_metadata ====================
export const articleMetadata = mysqlTable('article_metadata', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  articleUrl: varchar('article_url', { length: 1000 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  readNum: int('read_num').notNull().default(0),
  oldLikeNum: int('old_like_num').notNull().default(0),
  shareNum: int('share_num').notNull().default(0),
  likeNum: int('like_num').notNull().default(0),
  commentNum: int('comment_num').notNull().default(0),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').default(sql`NULL ON UPDATE CURRENT_TIMESTAMP`),
})

// ==================== article_comments ====================
export const articleComments = mysqlTable('article_comments', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  articleUrl: varchar('article_url', { length: 1000 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  data: json('data').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').default(sql`NULL ON UPDATE CURRENT_TIMESTAMP`),
})

// ==================== article_comment_replies ====================
export const articleCommentReplies = mysqlTable('article_comment_replies', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  articleUrl: varchar('article_url', { length: 1000 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  contentId: varchar('content_id', { length: 100 }).notNull(),
  data: json('data').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ==================== resources ====================
export const resources = mysqlTable('resources', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  resourceUrl: varchar('resource_url', { length: 1000 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
  mimeType: varchar('mime_type', { length: 100 }),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ==================== resource_maps ====================
export const resourceMaps = mysqlTable('resource_maps', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fakeid: varchar('fakeid', { length: 50 }).notNull(),
  articleUrl: varchar('article_url', { length: 1000 }).notNull(),
  resources: json('resources').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// ==================== user_preferences ====================
export const userPreferences = mysqlTable('user_preferences', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  preferences: json('preferences').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').default(sql`NULL ON UPDATE CURRENT_TIMESTAMP`),
})

// ==================== user_credentials ====================
export const userCredentials = mysqlTable('user_credentials', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  biz: varchar('biz', { length: 50 }).notNull(),
  uin: varchar('uin', { length: 100 }).notNull(),
  key: varchar('key', { length: 500 }).notNull(),
  passTicket: varchar('pass_ticket', { length: 500 }).notNull(),
  wapSid2: varchar('wap_sid2', { length: 500 }),
  nickname: varchar('nickname', { length: 100 }),
  avatar: varchar('avatar', { length: 500 }),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  valid: tinyint('valid').notNull().default(1),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uk_user_biz').on(table.userId, table.biz),
])

// ==================== favorites ====================
export const favorites = mysqlTable('favorites', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  articleId: bigint('article_id', { mode: 'number' }).notNull().references(() => articles.id, { onDelete: 'cascade' }),
  note: text('note'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uk_user_article').on(table.userId, table.articleId),
])

// ==================== operation_logs ====================
export const operationLogs = mysqlTable('operation_logs', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: varchar('target_id', { length: 100 }),
  detail: json('detail'),
  status: mysqlEnum('status', ['success', 'failed', 'pending']).notNull().default('success'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_user_time').on(table.userId, table.createdAt),
  index('idx_action').on(table.action),
])

// ==================== scheduled_tasks ====================
export const scheduledTasks = mysqlTable('scheduled_tasks', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['sync', 'download', 'cleanup']).notNull(),
  targetFakeid: varchar('target_fakeid', { length: 50 }),
  intervalHours: int('interval_hours').notNull().default(24),
  enabled: tinyint('enabled').notNull().default(1),
  lastRunAt: datetime('last_run_at'),
  nextRunAt: datetime('next_run_at'),
  status: mysqlEnum('status', ['idle', 'running', 'error']).notNull().default('idle'),
  lastError: text('last_error'),
  config: json('config'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at').default(sql`NULL ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_next_run').on(table.enabled, table.nextRunAt),
])

// ==================== export_jobs ====================
export const exportJobs = mysqlTable('export_jobs', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  format: mysqlEnum('format', ['html', 'excel', 'json', 'txt', 'markdown', 'word']).notNull(),
  fakeid: varchar('fakeid', { length: 50 }),
  articleUrls: json('article_urls').notNull(),
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).notNull().default('pending'),
  progress: int('progress').notNull().default(0),
  total: int('total').notNull().default(0),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: bigint('file_size', { mode: 'number' }).default(0),
  error: text('error'),
  expiresAt: datetime('expires_at'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: datetime('completed_at'),
}, (table) => [
  index('idx_user_status').on(table.userId, table.status),
])
