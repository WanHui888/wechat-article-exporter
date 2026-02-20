export default defineEventHandler(async (event) => {
  const { url } = getQuery(event)
  if (!url) return null

  const db = getDb()
  const row = db.prepare('SELECT * FROM metadata WHERE url = ?').get(url as string) as any
  if (!row) return null

  return {
    ...JSON.parse(row.data),
    fakeid: row.fakeid,
    url: row.url,
    title: row.title,
  }
})
