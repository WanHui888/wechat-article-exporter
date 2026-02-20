export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, fakeid, title, ...rest } = body

  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO metadata (url, fakeid, title, data) VALUES (?, ?, ?, ?)').run(
    url, fakeid, title, JSON.stringify({ url, fakeid, title, ...rest }),
  )

  return { ok: true }
})
