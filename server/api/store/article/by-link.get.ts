export default defineEventHandler(async (event) => {
  const { link } = getQuery(event)
  if (!link) return null

  const db = getDb()
  const row = db.prepare('SELECT data FROM article WHERE link = ? LIMIT 1').get(link as string) as any
  if (!row) return null

  return JSON.parse(row.data)
})
