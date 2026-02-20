export default defineEventHandler(async (event) => {
  const { url, contentID } = getQuery(event)
  if (!url || !contentID) return null

  const id = `${url}:${contentID}`
  const db = getDb()
  const row = db.prepare('SELECT * FROM comment_reply WHERE id = ?').get(id) as any
  if (!row) return null

  return {
    url: row.url,
    fakeid: row.fakeid,
    title: row.title,
    data: JSON.parse(row.data),
    contentID: row.content_id,
  }
})
