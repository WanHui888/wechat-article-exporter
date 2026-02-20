import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dbPath = resolve(process.env.SQLITE_PATH || '.data/exporter.sqlite')
  const dir = dirname(dbPath)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  initSchema(_db)

  return _db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS article (
      id TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      link TEXT NOT NULL,
      create_time INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_article_fakeid ON article(fakeid);
    CREATE INDEX IF NOT EXISTS idx_article_link ON article(link);
    CREATE INDEX IF NOT EXISTS idx_article_create_time ON article(create_time);

    CREATE TABLE IF NOT EXISTS html (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      title TEXT NOT NULL,
      file BLOB NOT NULL,
      comment_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_html_fakeid ON html(fakeid);

    CREATE TABLE IF NOT EXISTS comment (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comment_fakeid ON comment(fakeid);

    CREATE TABLE IF NOT EXISTS comment_reply (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      fakeid TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL,
      content_id TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comment_reply_url ON comment_reply(url);
    CREATE INDEX IF NOT EXISTS idx_comment_reply_fakeid ON comment_reply(fakeid);
    CREATE INDEX IF NOT EXISTS idx_comment_reply_content_id ON comment_reply(content_id);

    CREATE TABLE IF NOT EXISTS metadata (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metadata_fakeid ON metadata(fakeid);

    CREATE TABLE IF NOT EXISTS info (
      fakeid TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resource (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      file BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resource_fakeid ON resource(fakeid);

    CREATE TABLE IF NOT EXISTS resource_map (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      resources TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resource_map_fakeid ON resource_map(fakeid);

    CREATE TABLE IF NOT EXISTS asset (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      file BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_asset_fakeid ON asset(fakeid);

    CREATE TABLE IF NOT EXISTS debug (
      url TEXT PRIMARY KEY,
      fakeid TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      file BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_debug_fakeid ON debug(fakeid);
  `)
}
