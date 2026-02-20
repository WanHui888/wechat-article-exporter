export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { key, article } = body

  const db = getDb()
  db.prepare(
    'INSERT OR REPLACE INTO article (id, fakeid, link, create_time, data) VALUES (?, ?, ?, ?, ?)',
  ).run(key, article.fakeid, article.link, article.create_time, JSON.stringify(article))

  return { ok: true }
})
