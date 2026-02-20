export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, fakeid, title, data } = body

  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO comment (url, fakeid, title, data) VALUES (?, ?, ?, ?)').run(
    url, fakeid, title, JSON.stringify(data),
  )

  return { ok: true }
})
