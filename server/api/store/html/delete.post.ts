export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url } = body

  const db = getDb()
  db.prepare('DELETE FROM html WHERE url = ?').run(url)

  return { ok: true }
})
