export default defineEventHandler(async (event) => {
  const { accounts } = await readBody(event)
  const db = getDb()

  const upsert = db.transaction((mpAccounts: any[]) => {
    for (const account of mpAccounts) {
      const existing = db.prepare('SELECT data FROM info WHERE fakeid = ?').get(account.fakeid) as any
      if (existing) {
        const info = JSON.parse(existing.data)
        // 导入时保留原有 nickname/round_head_img，重置计数
        if (account.nickname) info.nickname = account.nickname
        if (account.round_head_img) info.round_head_img = account.round_head_img
        info.completed = false
        info.count = 0
        info.articles = 0
        info.total_count = 0
        delete info.create_time
        delete info.update_time
        delete info.last_update_time
        db.prepare('UPDATE info SET data = ? WHERE fakeid = ?').run(JSON.stringify(info), account.fakeid)
      } else {
        const newInfo = {
          fakeid: account.fakeid,
          completed: false,
          count: 0,
          articles: 0,
          total_count: 0,
          nickname: account.nickname,
          round_head_img: account.round_head_img,
        }
        db.prepare('INSERT INTO info (fakeid, data) VALUES (?, ?)').run(account.fakeid, JSON.stringify(newInfo))
      }
    }
  })

  upsert(accounts)
  return { ok: true }
})
