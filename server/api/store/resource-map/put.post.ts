export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, fakeid, resources } = body

  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO resource_map (url, fakeid, resources) VALUES (?, ?, ?)').run(
    url, fakeid, JSON.stringify(resources),
  )

  return { ok: true }
})
