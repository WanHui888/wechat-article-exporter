export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { table, rows } = body

  if (!table || !rows || !Array.isArray(rows)) {
    throw createError({ statusCode: 400, message: 'table and rows are required' })
  }

  const db = getDb()
  let imported = 0
  let failed = 0

  const doImport = db.transaction(() => {
    for (const row of rows) {
      try {
        switch (table) {
          case 'article': {
            const key = row.id || `${row.fakeid}:${row.aid}`
            db.prepare(
              'INSERT OR REPLACE INTO article (id, fakeid, link, create_time, data) VALUES (?, ?, ?, ?, ?)',
            ).run(key, row.fakeid, row.link, row.create_time, JSON.stringify(row))
            break
          }
          case 'html': {
            const buf = Buffer.from(row.file, 'base64')
            db.prepare(
              'INSERT OR REPLACE INTO html (url, fakeid, title, file, comment_id) VALUES (?, ?, ?, ?, ?)',
            ).run(row.url, row.fakeid, row.title, buf, row.commentID ?? null)
            break
          }
          case 'comment': {
            db.prepare(
              'INSERT OR REPLACE INTO comment (url, fakeid, title, data) VALUES (?, ?, ?, ?)',
            ).run(row.url, row.fakeid, row.title, JSON.stringify(row.data))
            break
          }
          case 'comment_reply': {
            const id = `${row.url}:${row.contentID}`
            db.prepare(
              'INSERT OR REPLACE INTO comment_reply (id, url, fakeid, title, data, content_id) VALUES (?, ?, ?, ?, ?, ?)',
            ).run(id, row.url, row.fakeid, row.title, JSON.stringify(row.data), row.contentID)
            break
          }
          case 'metadata': {
            db.prepare(
              'INSERT OR REPLACE INTO metadata (url, fakeid, title, data) VALUES (?, ?, ?, ?)',
            ).run(row.url, row.fakeid, row.title, JSON.stringify(row))
            break
          }
          case 'info': {
            db.prepare(
              'INSERT OR REPLACE INTO info (fakeid, data) VALUES (?, ?)',
            ).run(row.fakeid, JSON.stringify(row))
            break
          }
          case 'resource': {
            const buf = Buffer.from(row.file, 'base64')
            db.prepare(
              'INSERT OR REPLACE INTO resource (url, fakeid, file) VALUES (?, ?, ?)',
            ).run(row.url, row.fakeid, buf)
            break
          }
          case 'resource-map': {
            db.prepare(
              'INSERT OR REPLACE INTO resource_map (url, fakeid, resources) VALUES (?, ?, ?)',
            ).run(row.url, row.fakeid, JSON.stringify(row.resources))
            break
          }
          case 'asset': {
            const buf = Buffer.from(row.file, 'base64')
            db.prepare(
              'INSERT OR REPLACE INTO asset (url, fakeid, file) VALUES (?, ?, ?)',
            ).run(row.url, row.fakeid, buf)
            break
          }
          case 'debug': {
            const buf = Buffer.from(row.file, 'base64')
            db.prepare(
              'INSERT OR REPLACE INTO debug (url, fakeid, type, title, file) VALUES (?, ?, ?, ?, ?)',
            ).run(row.url, row.fakeid, row.type, row.title, buf)
            break
          }
          default:
            failed++
            continue
        }
        imported++
      } catch {
        failed++
      }
    }
  })

  doImport()

  return { ok: true, imported, failed }
})
