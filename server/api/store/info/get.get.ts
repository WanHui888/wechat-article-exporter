export default defineEventHandler(async (event) => {
  const { fakeid } = getQuery(event)
  if (!fakeid) return null

  const db = getDb()
  const row = db.prepare('SELECT data FROM info WHERE fakeid = ?').get(fakeid as string) as any
  if (!row) return null

  return JSON.parse(row.data)
})
