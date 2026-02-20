export default defineEventHandler(async (event) => {
  const { key } = await readBody(event)

  const db = getDb()
  db.prepare('DELETE FROM article WHERE id = ?').run(key)

  return { ok: true }
})
