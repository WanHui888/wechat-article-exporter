export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, fakeid, title, data, contentID } = body
  const id = `${url}:${contentID}`

  const db = getDb()
  db.prepare(
    'INSERT OR REPLACE INTO comment_reply (id, url, fakeid, title, data, content_id) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, url, fakeid, title, JSON.stringify(data), contentID)

  return { ok: true }
})
