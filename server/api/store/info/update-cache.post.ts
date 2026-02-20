export default defineEventHandler(async (event) => {
  const mpAccount = await readBody(event)
  const db = getDb()

  const updateCache = db.transaction((account: any) => {
    const existing = db.prepare('SELECT data FROM info WHERE fakeid = ?').get(account.fakeid) as any
    if (existing) {
      const info = JSON.parse(existing.data)
      if (account.completed) info.completed = true
      info.count += account.count
      info.articles += account.articles
      info.nickname = account.nickname
      info.round_head_img = account.round_head_img
      info.total_count = account.total_count
      info.update_time = Math.round(Date.now() / 1000)
      db.prepare('UPDATE info SET data = ? WHERE fakeid = ?').run(JSON.stringify(info), account.fakeid)
    } else {
      const newInfo = {
        fakeid: account.fakeid,
        completed: account.completed,
        count: account.count,
        articles: account.articles,
        nickname: account.nickname,
        round_head_img: account.round_head_img,
        total_count: account.total_count,
        create_time: Math.round(Date.now() / 1000),
        update_time: Math.round(Date.now() / 1000),
      }
      db.prepare('INSERT INTO info (fakeid, data) VALUES (?, ?)').run(account.fakeid, JSON.stringify(newInfo))
    }
    return true
  })

  updateCache(mpAccount)
  return { ok: true }
})
