import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { eq, sql } from 'drizzle-orm'
import { getDb, schema } from '~/server/database'

export class FileService {
  private dataDir: string

  constructor() {
    const config = useRuntimeConfig()
    this.dataDir = config.dataDir || './data'
  }

  getUploadPath(userId: number, fakeid: string, type: 'html' | 'resources' = 'html'): string {
    return join(this.dataDir, 'uploads', String(userId), fakeid, type)
  }

  getExportPath(): string {
    return join(this.dataDir, 'exports')
  }

  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true })
  }

  async saveFile(filePath: string, content: string | Buffer): Promise<number> {
    await this.ensureDir(dirname(filePath))
    await fs.writeFile(filePath, content)
    const stat = await fs.stat(filePath)
    return stat.size
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath)
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch {
      // File may not exist
    }
  }

  async deleteDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true })
    } catch {
      // Dir may not exist
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stat = await fs.stat(filePath)
      return stat.size
    } catch {
      return 0
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async checkQuota(userId: number, additionalBytes: number): Promise<boolean> {
    const db = getDb()
    const rows = await db.select({
      storageQuota: schema.users.storageQuota,
      storageUsed: schema.users.storageUsed,
    })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    const user = rows[0]
    if (!user) return false
    return (user.storageUsed + additionalBytes) <= user.storageQuota
  }

  async updateStorageUsed(userId: number, deltaBytes: number): Promise<void> {
    const db = getDb()
    await db.update(schema.users)
      .set({
        storageUsed: sql`storage_used + ${deltaBytes}`,
      })
      .where(eq(schema.users.id, userId))
  }

  async recalculateStorage(userId: number): Promise<number> {
    const db = getDb()

    const [htmlResult, resourceResult] = await Promise.all([
      db.select({ total: sql<number>`COALESCE(SUM(file_size), 0)` })
        .from(schema.articleHtml)
        .where(eq(schema.articleHtml.userId, userId)),
      db.select({ total: sql<number>`COALESCE(SUM(file_size), 0)` })
        .from(schema.resources)
        .where(eq(schema.resources.userId, userId)),
    ])

    const total = (htmlResult[0]?.total || 0) + (resourceResult[0]?.total || 0)

    await db.update(schema.users)
      .set({ storageUsed: total })
      .where(eq(schema.users.id, userId))

    return total
  }
}

let _fileService: FileService | null = null
export function getFileService(): FileService {
  if (!_fileService) _fileService = new FileService()
  return _fileService
}
