export default defineEventHandler(async (event) => {
  const { url } = getQuery(event)
  if (!url) return null

  const db = getDb()
  const row = db.prepare('SELECT * FROM resource_map WHERE url = ?').get(url as string) as any
  if (!row) return null

  return {
    url: row.url,
    fakeid: row.fakeid,
    resources: JSON.parse(row.resources),
  }
})
