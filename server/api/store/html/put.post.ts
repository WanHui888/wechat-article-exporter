export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, fakeid, title, file, commentID } = body

  const buf = Buffer.from(file, 'base64')
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO html (url, fakeid, title, file, comment_id) VALUES (?, ?, ?, ?, ?)').run(
    url, fakeid, title, buf, commentID ?? null,
  )

  return { ok: true }
})
