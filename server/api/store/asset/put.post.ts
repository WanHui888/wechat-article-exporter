export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, fakeid, file } = body

  const buf = Buffer.from(file, 'base64')
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO asset (url, fakeid, file) VALUES (?, ?, ?)').run(url, fakeid, buf)

  return { ok: true }
})
