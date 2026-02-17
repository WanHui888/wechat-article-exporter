import { drizzle } from 'drizzle-orm/mysql2'
import { sql } from 'drizzle-orm'
import mysql from 'mysql2/promise'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _pool: mysql.Pool | null = null

export function getPool() {
  if (!_pool) {
    const config = useRuntimeConfig()
    _pool = mysql.createPool({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_POOL_SIZE || '50'),  // 20 → 50
      queueLimit: 100,  // 0 (无限) → 100 (防止无限堆积)
      enableKeepAlive: true,
      keepAliveInitialDelay: 5000,  // 10000 → 5000 (更快的心跳)
      charset: 'utf8mb4',
    })
  }
  return _pool
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema, mode: 'default' })
  }
  return _db
}

/**
 * Initialize database connection and verify connectivity
 */
export function initDatabase() {
  const db = getDb()
  console.log('[Database] Connection pool initialized')
  return db
}

/**
 * Run database migrations using Drizzle push (sync schema to database)
 */
export async function runMigrations() {
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    // Create tables if they don't exist using raw SQL
    // Drizzle's push is done via CLI, so we create tables manually here
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE DEFAULT NULL,
        nickname VARCHAR(50) DEFAULT NULL,
        avatar VARCHAR(500) DEFAULT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
        storage_quota BIGINT NOT NULL DEFAULT 5368709120,
        storage_used BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        last_login_at DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS wechat_sessions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        auth_key VARCHAR(64) NOT NULL UNIQUE,
        token VARCHAR(255) NOT NULL,
        cookies JSON NOT NULL,
        mp_nickname VARCHAR(100) DEFAULT NULL,
        mp_avatar VARCHAR(500) DEFAULT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        CONSTRAINT fk_ws_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS mp_accounts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        nickname VARCHAR(100) DEFAULT NULL,
        alias VARCHAR(100) DEFAULT NULL,
        round_head_img VARCHAR(500) DEFAULT NULL,
        service_type INT DEFAULT 0,
        signature TEXT DEFAULT NULL,
        total_count INT NOT NULL DEFAULT 0,
        synced_count INT NOT NULL DEFAULT 0,
        synced_articles INT NOT NULL DEFAULT 0,
        completed TINYINT(1) NOT NULL DEFAULT 0,
        auto_sync TINYINT(1) NOT NULL DEFAULT 0,
        sync_interval INT DEFAULT 24,
        last_sync_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_fakeid (user_id, fakeid),
        CONSTRAINT fk_ma_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS articles (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        aid VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        link VARCHAR(1000) NOT NULL,
        cover VARCHAR(500) DEFAULT NULL,
        digest TEXT DEFAULT NULL,
        author_name VARCHAR(100) DEFAULT NULL,
        create_time INT UNSIGNED DEFAULT NULL,
        update_time INT UNSIGNED DEFAULT NULL,
        appmsgid BIGINT DEFAULT NULL,
        itemidx INT DEFAULT NULL,
        item_show_type INT NOT NULL DEFAULT 0,
        copyright_stat INT DEFAULT NULL,
        copyright_type INT DEFAULT NULL,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        is_pay_subscribe INT NOT NULL DEFAULT 0,
        is_favorited TINYINT(1) NOT NULL DEFAULT 0,
        album_id VARCHAR(50) DEFAULT NULL,
        appmsg_album_infos JSON DEFAULT NULL,
        media_duration VARCHAR(20) DEFAULT NULL,
        status VARCHAR(50) NOT NULL DEFAULT '',
        is_single TINYINT(1) NOT NULL DEFAULT 0,
        extra_data JSON DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_fakeid_aid (user_id, fakeid, aid),
        INDEX idx_user_fakeid_time (user_id, fakeid, create_time),
        INDEX idx_user_favorite (user_id, is_favorited),
        CONSTRAINT fk_art_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS article_html (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        article_url VARCHAR(1000) NOT NULL,
        title VARCHAR(500) NOT NULL,
        comment_id VARCHAR(100) DEFAULT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_url (user_id, article_url(255)),
        CONSTRAINT fk_html_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS article_metadata (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        article_url VARCHAR(1000) NOT NULL,
        title VARCHAR(500) NOT NULL,
        read_num INT NOT NULL DEFAULT 0,
        old_like_num INT NOT NULL DEFAULT 0,
        share_num INT NOT NULL DEFAULT 0,
        like_num INT NOT NULL DEFAULT 0,
        comment_num INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_url (user_id, article_url(255)),
        CONSTRAINT fk_meta_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS article_comments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        article_url VARCHAR(1000) NOT NULL,
        title VARCHAR(500) NOT NULL,
        data JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_url (user_id, article_url(255)),
        CONSTRAINT fk_cmt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS article_comment_replies (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        article_url VARCHAR(1000) NOT NULL,
        title VARCHAR(500) NOT NULL,
        content_id VARCHAR(100) NOT NULL,
        data JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_url_content (user_id, article_url(255), content_id),
        CONSTRAINT fk_reply_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS resources (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        resource_url VARCHAR(1000) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        mime_type VARCHAR(100) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_url (user_id, resource_url(255)),
        CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS resource_maps (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        fakeid VARCHAR(50) NOT NULL,
        article_url VARCHAR(1000) NOT NULL,
        resources JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_url (user_id, article_url(255)),
        CONSTRAINT fk_rmap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS user_preferences (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL UNIQUE,
        preferences JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS user_credentials (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        biz VARCHAR(50) NOT NULL,
        uin VARCHAR(100) NOT NULL,
        \`key\` VARCHAR(500) NOT NULL,
        pass_ticket VARCHAR(500) NOT NULL,
        wap_sid2 VARCHAR(500) DEFAULT NULL,
        nickname VARCHAR(100) DEFAULT NULL,
        avatar VARCHAR(500) DEFAULT NULL,
        \`timestamp\` BIGINT NOT NULL,
        valid TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_biz (user_id, biz),
        CONSTRAINT fk_cred_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS favorites (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        article_id BIGINT UNSIGNED NOT NULL,
        note TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_article (user_id, article_id),
        CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_fav_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS operation_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(50) DEFAULT NULL,
        target_id VARCHAR(100) DEFAULT NULL,
        detail JSON DEFAULT NULL,
        status ENUM('success', 'failed', 'pending') NOT NULL DEFAULT 'success',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_time (user_id, created_at),
        INDEX idx_action (action),
        CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        type ENUM('sync', 'download', 'cleanup') NOT NULL,
        target_fakeid VARCHAR(50) DEFAULT NULL,
        interval_hours INT NOT NULL DEFAULT 24,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        last_run_at DATETIME DEFAULT NULL,
        next_run_at DATETIME DEFAULT NULL,
        status ENUM('idle', 'running', 'error') NOT NULL DEFAULT 'idle',
        last_error TEXT DEFAULT NULL,
        config JSON DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_next_run (enabled, next_run_at),
        CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS export_jobs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        format ENUM('html', 'excel', 'json', 'txt', 'markdown', 'word') NOT NULL,
        fakeid VARCHAR(50) DEFAULT NULL,
        article_urls JSON NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
        progress INT NOT NULL DEFAULT 0,
        total INT NOT NULL DEFAULT 0,
        file_path VARCHAR(500) DEFAULT NULL,
        file_size BIGINT DEFAULT 0,
        error TEXT DEFAULT NULL,
        expires_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME DEFAULT NULL,
        INDEX idx_user_status (user_id, status),
        CONSTRAINT fk_export_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ]

    for (const createSql of tables) {
      await conn.query(createSql)
    }

    console.log('[Database] All tables created/verified')
  } finally {
    conn.release()
  }
}

export { schema }
