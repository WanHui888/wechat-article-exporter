import { eq, and, desc, sql } from 'drizzle-orm'
import { join } from 'path'
import archiver from 'archiver'
import { createWriteStream, promises as fs } from 'fs'
import pLimit from 'p-limit'
import { getDb, schema } from '~/server/database'
import { getHtmlService } from './html.service'
import { getMetadataService } from './metadata.service'
import { getCommentService } from './comment.service'
import { getResourceService } from './resource.service'
import { getFileService } from './file.service'
import type { ExportFormat } from '~/types'

export class ExportService {
  private db = getDb()

  async createJob(userId: number, format: ExportFormat, articleUrls: string[], fakeid?: string) {
    const result = await this.db.insert(schema.exportJobs).values({
      userId,
      format,
      fakeid,
      articleUrls,
      total: articleUrls.length,
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
    })

    const jobId = result[0].insertId

    // Process async
    this.processJob(jobId, userId).catch(err => {
      console.error(`Export job ${jobId} failed:`, err)
    })

    return { id: jobId }
  }

  async getJobs(userId: number) {
    return this.db.select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.userId, userId))
      .orderBy(desc(schema.exportJobs.createdAt))
      .limit(50)
  }

  async getJob(userId: number, jobId: number) {
    const rows = await this.db.select()
      .from(schema.exportJobs)
      .where(and(
        eq(schema.exportJobs.userId, userId),
        eq(schema.exportJobs.id, jobId),
      ))
      .limit(1)
    return rows[0] || null
  }

  async deleteJob(userId: number, jobId: number) {
    const job = await this.getJob(userId, jobId)
    if (job?.filePath) {
      const fileService = getFileService()
      await fileService.deleteFile(job.filePath)
    }
    await this.db.delete(schema.exportJobs)
      .where(and(
        eq(schema.exportJobs.userId, userId),
        eq(schema.exportJobs.id, jobId),
      ))
  }

  private async processJob(jobId: number, userId: number) {
    try {
      await this.db.update(schema.exportJobs)
        .set({ status: 'processing' })
        .where(eq(schema.exportJobs.id, jobId))

      const job = (await this.db.select()
        .from(schema.exportJobs)
        .where(eq(schema.exportJobs.id, jobId))
        .limit(1))[0]

      if (!job) return

      const format = job.format
      const articleUrls = job.articleUrls as string[]

      const fileService = getFileService()
      const exportDir = fileService.getExportPath()
      await fileService.ensureDir(exportDir)

      const zipPath = join(exportDir, `export_${jobId}_${Date.now()}.zip`)

      switch (format) {
        case 'html':
          await this.exportHtml(userId, articleUrls, zipPath, jobId)
          break
        case 'excel':
          await this.exportExcel(userId, articleUrls, zipPath, jobId)
          break
        case 'json':
          await this.exportJson(userId, articleUrls, zipPath, jobId)
          break
        case 'txt':
          await this.exportTxt(userId, articleUrls, zipPath, jobId)
          break
        case 'markdown':
          await this.exportMarkdown(userId, articleUrls, zipPath, jobId)
          break
        case 'word':
          await this.exportWord(userId, articleUrls, zipPath, jobId)
          break
      }

      const fileSize = await fileService.getFileSize(zipPath)

      await this.db.update(schema.exportJobs)
        .set({
          status: 'completed',
          filePath: zipPath,
          fileSize,
          progress: job.total,
          completedAt: new Date(),
        })
        .where(eq(schema.exportJobs.id, jobId))
    } catch (error: any) {
      await this.db.update(schema.exportJobs)
        .set({
          status: 'failed',
          error: error.message || '导出失败',
        })
        .where(eq(schema.exportJobs.id, jobId))
    }
  }

  private async exportHtml(userId: number, urls: string[], zipPath: string, jobId: number) {
    const htmlService = getHtmlService()
    const fileService = getFileService()

    const archive = archiver('zip', { zlib: { level: 6 } })
    const output = createWriteStream(zipPath)
    archive.pipe(output)

    let progress = 0
    const limit = pLimit(10) // 并发限制：10个

    // 并行处理所有 URL
    const tasks = urls.map(url => limit(async () => {
      const html = await htmlService.getHtml(userId, url)
      if (html?.filePath) {
        const exists = await fileService.fileExists(html.filePath)
        if (exists) {
          const content = await fileService.readFile(html.filePath)
          const safeName = this.sanitizeFileName(html.title) + '.html'
          archive.append(content, { name: safeName })
        }
      }
      progress++
      if (progress % 10 === 0) {
        await this.updateProgress(jobId, progress)
      }
    }))

    await Promise.all(tasks)

    await archive.finalize()
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
    })
  }

  private async exportExcel(userId: number, urls: string[], zipPath: string, jobId: number) {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('文章列表')

    sheet.columns = [
      { header: '标题', key: 'title', width: 50 },
      { header: '作者', key: 'author', width: 15 },
      { header: '发布时间', key: 'createTime', width: 20 },
      { header: '链接', key: 'link', width: 60 },
      { header: '阅读量', key: 'readNum', width: 10 },
      { header: '点赞', key: 'likeNum', width: 10 },
      { header: '在看', key: 'oldLikeNum', width: 10 },
      { header: '评论数', key: 'commentNum', width: 10 },
      { header: '分享', key: 'shareNum', width: 10 },
      { header: '摘要', key: 'digest', width: 80 },
    ]

    const articleService = (await import('./article.service')).getArticleService()
    const metadataService = getMetadataService()

    let progress = 0
    for (const url of urls) {
      const article = await articleService.getArticleByUrl(userId, url)
      const metadata = await metadataService.getMetadata(userId, url)

      if (article) {
        sheet.addRow({
          title: article.title,
          author: article.authorName || '',
          createTime: article.createTime ? new Date(article.createTime * 1000).toISOString().split('T')[0] : '',
          link: article.link,
          readNum: metadata?.readNum || 0,
          likeNum: metadata?.likeNum || 0,
          oldLikeNum: metadata?.oldLikeNum || 0,
          commentNum: metadata?.commentNum || 0,
          shareNum: metadata?.shareNum || 0,
          digest: article.digest || '',
        })
      }
      progress++
      if (progress % 20 === 0) await this.updateProgress(jobId, progress)
    }

    const buffer = await workbook.xlsx.writeBuffer()

    const archive = archiver('zip', { zlib: { level: 6 } })
    const output = createWriteStream(zipPath)
    archive.pipe(output)
    archive.append(Buffer.from(buffer), { name: '文章列表.xlsx' })
    await archive.finalize()
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
    })
  }

  private async exportJson(userId: number, urls: string[], zipPath: string, jobId: number) {
    const articleService = (await import('./article.service')).getArticleService()
    const metadataService = getMetadataService()
    const commentService = getCommentService()

    const articles = []
    let progress = 0
    for (const url of urls) {
      const article = await articleService.getArticleByUrl(userId, url)
      const metadata = await metadataService.getMetadata(userId, url)
      const comment = await commentService.getComment(userId, url)

      if (article) {
        articles.push({
          ...article,
          metadata: metadata ? {
            readNum: metadata.readNum,
            likeNum: metadata.likeNum,
            oldLikeNum: metadata.oldLikeNum,
            shareNum: metadata.shareNum,
            commentNum: metadata.commentNum,
          } : null,
          comments: comment?.data || null,
        })
      }
      progress++
      if (progress % 20 === 0) await this.updateProgress(jobId, progress)
    }

    const archive = archiver('zip', { zlib: { level: 6 } })
    const output = createWriteStream(zipPath)
    archive.pipe(output)
    archive.append(JSON.stringify(articles, null, 2), { name: '文章数据.json' })
    await archive.finalize()
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
    })
  }

  private async exportTxt(userId: number, urls: string[], zipPath: string, jobId: number) {
    const htmlService = getHtmlService()
    const fileService = getFileService()

    const archive = archiver('zip', { zlib: { level: 6 } })
    const output = createWriteStream(zipPath)
    archive.pipe(output)

    let progress = 0
    for (const url of urls) {
      const html = await htmlService.getHtml(userId, url)
      if (html?.filePath) {
        const exists = await fileService.fileExists(html.filePath)
        if (exists) {
          const content = await fileService.readFile(html.filePath)
          const textContent = this.htmlToText(content.toString('utf-8'))
          const safeName = this.sanitizeFileName(html.title) + '.txt'
          archive.append(textContent, { name: safeName })
        }
      }
      progress++
      if (progress % 10 === 0) await this.updateProgress(jobId, progress)
    }

    await archive.finalize()
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
    })
  }

  private async exportMarkdown(userId: number, urls: string[], zipPath: string, jobId: number) {
    const TurndownService = (await import('turndown')).default
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    })

    const htmlService = getHtmlService()
    const fileService = getFileService()

    const archive = archiver('zip', { zlib: { level: 6 } })
    const output = createWriteStream(zipPath)
    archive.pipe(output)

    let progress = 0
    for (const url of urls) {
      const html = await htmlService.getHtml(userId, url)
      if (html?.filePath) {
        const exists = await fileService.fileExists(html.filePath)
        if (exists) {
          const content = await fileService.readFile(html.filePath)
          const bodyContent = this.extractBody(content.toString('utf-8'))
          const markdown = turndownService.turndown(bodyContent)
          const safeName = this.sanitizeFileName(html.title) + '.md'
          archive.append(`# ${html.title}\n\n${markdown}`, { name: safeName })
        }
      }
      progress++
      if (progress % 10 === 0) await this.updateProgress(jobId, progress)
    }

    await archive.finalize()
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
    })
  }

  private async exportWord(userId: number, urls: string[], zipPath: string, jobId: number) {
    const { Document, Packer, Paragraph, TextRun } = await import('docx')
    const htmlService = getHtmlService()
    const fileService = getFileService()

    const archive = archiver('zip', { zlib: { level: 6 } })
    const output = createWriteStream(zipPath)
    archive.pipe(output)

    let progress = 0
    for (const url of urls) {
      const html = await htmlService.getHtml(userId, url)
      if (html?.filePath) {
        const exists = await fileService.fileExists(html.filePath)
        if (exists) {
          const content = await fileService.readFile(html.filePath)
          const textContent = this.htmlToText(content.toString('utf-8'))
          const lines = textContent.split('\n').filter(l => l.trim())

          const doc = new Document({
            sections: [{
              children: [
                new Paragraph({
                  children: [new TextRun({ text: html.title, bold: true, size: 32 })],
                }),
                ...lines.map(line => new Paragraph({
                  children: [new TextRun({ text: line, size: 24 })],
                })),
              ],
            }],
          })

          const buffer = await Packer.toBuffer(doc)
          const safeName = this.sanitizeFileName(html.title) + '.docx'
          archive.append(buffer, { name: safeName })
        }
      }
      progress++
      if (progress % 10 === 0) await this.updateProgress(jobId, progress)
    }

    await archive.finalize()
    await new Promise<void>((resolve, reject) => {
      output.on('close', resolve)
      output.on('error', reject)
    })
  }

  private async updateProgress(jobId: number, progress: number) {
    await this.db.update(schema.exportJobs)
      .set({ progress })
      .where(eq(schema.exportJobs.id, jobId))
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 80)
  }

  private htmlToText(html: string): string {
    const body = this.extractBody(html)
    return body
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private extractBody(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    return bodyMatch ? bodyMatch[1]! : html
  }

  async cleanExpiredJobs() {
    const fileService = getFileService()
    const expired = await this.db.select()
      .from(schema.exportJobs)
      .where(sql`expires_at < NOW() AND file_path IS NOT NULL`)

    for (const job of expired) {
      if (job.filePath) {
        await fileService.deleteFile(job.filePath)
      }
    }

    await this.db.delete(schema.exportJobs)
      .where(sql`expires_at < NOW()`)
  }
}

let _exportService: ExportService | null = null
export function getExportService(): ExportService {
  if (!_exportService) _exportService = new ExportService()
  return _exportService
}
