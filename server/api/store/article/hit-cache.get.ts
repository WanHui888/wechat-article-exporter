export default defineEventHandler(async (event) => {
  const { fakeid, create_time } = getQuery(event)
  if (!fakeid || !create_time) return { hit: false }

  const db = getDb()
  const row = db.prepare(
    'SELECT COUNT(*) as cnt FROM article WHERE fakeid = ? AND create_time < ?',
  ).get(fakeid as string, Number(create_time)) as any

  return { hit: row.cnt > 0 }
})
