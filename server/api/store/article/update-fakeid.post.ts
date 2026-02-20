export default defineEventHandler(async (event) => {
  const { url, fakeid } = await readBody(event)

  const db = getDb()
  const rows = db.prepare(
    "SELECT id, data FROM article WHERE link = ? AND fakeid = 'SINGLE_ARTICLE_FAKEID'",
  ).all(url) as any[]

  const update = db.transaction(() => {
    for (const row of rows) {
      const data = JSON.parse(row.data)
      data.fakeid = fakeid
      data._single = true
      // 更新主键和 fakeid 字段
      db.prepare('DELETE FROM article WHERE id = ?').run(row.id)
      const newKey = `${fakeid}:${data.aid}`
      db.prepare(
        'INSERT OR REPLACE INTO article (id, fakeid, link, create_time, data) VALUES (?, ?, ?, ?, ?)',
      ).run(newKey, fakeid, data.link, data.create_time, JSON.stringify(data))
    }
  })
  update()

  return { ok: true }
})
