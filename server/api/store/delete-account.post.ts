export default defineEventHandler(async (event) => {
  const { ids } = await readBody(event)
  if (!ids || !ids.length) return { ok: true }

  const db = getDb()

  const deleteAll = db.transaction((fakeids: string[]) => {
    const placeholders = fakeids.map(() => '?').join(',')
    db.prepare(`DELETE FROM article WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM asset WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM comment WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM comment_reply WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM debug WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM html WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM info WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM metadata WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM resource WHERE fakeid IN (${placeholders})`).run(...fakeids)
    db.prepare(`DELETE FROM resource_map WHERE fakeid IN (${placeholders})`).run(...fakeids)
  })

  deleteAll(ids)
  return { ok: true }
})
