export default defineEventHandler(async (event) => {
  const { fakeid } = await readBody(event)

  const db = getDb()
  const row = db.prepare('SELECT data FROM info WHERE fakeid = ?').get(fakeid) as any
  if (row) {
    const info = JSON.parse(row.data)
    info.last_update_time = Math.round(Date.now() / 1000)
    db.prepare('UPDATE info SET data = ? WHERE fakeid = ?').run(JSON.stringify(info), fakeid)
  }

  return { ok: true }
})
