export default defineEventHandler(async (event) => {
  const { url, is_deleted } = await readBody(event)

  const db = getDb()
  const rows = db.prepare('SELECT id, data FROM article WHERE link = ?').all(url) as any[]

  const update = db.transaction(() => {
    for (const row of rows) {
      const data = JSON.parse(row.data)
      data.is_deleted = is_deleted ?? true
      db.prepare('UPDATE article SET data = ? WHERE id = ?').run(JSON.stringify(data), row.id)
    }
  })
  update()

  return { ok: true }
})
