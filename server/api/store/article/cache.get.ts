export default defineEventHandler(async (event) => {
  const { fakeid, create_time } = getQuery(event)
  if (!fakeid || !create_time) return []

  const db = getDb()
  const rows = db.prepare(
    'SELECT data FROM article WHERE fakeid = ? AND create_time < ? ORDER BY create_time DESC',
  ).all(fakeid as string, Number(create_time)) as any[]

  return rows.map(row => JSON.parse(row.data))
})
