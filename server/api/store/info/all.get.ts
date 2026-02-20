export default defineEventHandler(async () => {
  const db = getDb()
  const rows = db.prepare('SELECT data FROM info').all() as any[]
  return rows.map(row => JSON.parse(row.data))
})
