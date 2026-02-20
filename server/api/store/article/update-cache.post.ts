export default defineEventHandler(async (event) => {
  const { account, publish_page } = await readBody(event)

  const db = getDb()

  const doUpdate = db.transaction(() => {
    const existingKeys = new Set(
      (db.prepare('SELECT id FROM article').all() as any[]).map((r: any) => r.id),
    )

    const fakeid = account.fakeid
    const total_count = publish_page.total_count
    const publish_list = (publish_page.publish_list as any[]).filter((item: any) => !!item.publish_info)

    let msgCount = 0
    let articleCount = 0

    for (const item of publish_list) {
      const publish_info = JSON.parse(item.publish_info)
      let newEntryCount = 0

      for (const article of publish_info.appmsgex) {
        const key = `${fakeid}:${article.aid}`
        const articleData = { ...article, fakeid, _status: '' }
        db.prepare(
          'INSERT OR REPLACE INTO article (id, fakeid, link, create_time, data) VALUES (?, ?, ?, ?, ?)',
        ).run(key, fakeid, article.link, article.create_time, JSON.stringify(articleData))

        if (!existingKeys.has(key)) {
          newEntryCount++
          articleCount++
          existingKeys.add(key)
        }
      }

      if (newEntryCount > 0) {
        msgCount++
      }
    }

    // Update info cache
    const infoRow = db.prepare('SELECT data FROM info WHERE fakeid = ?').get(fakeid) as any
    if (infoRow) {
      const info = JSON.parse(infoRow.data)
      if (publish_list.length === 0) info.completed = true
      info.count += msgCount
      info.articles += articleCount
      info.nickname = account.nickname
      info.round_head_img = account.round_head_img
      info.total_count = total_count
      info.update_time = Math.round(Date.now() / 1000)
      db.prepare('UPDATE info SET data = ? WHERE fakeid = ?').run(JSON.stringify(info), fakeid)
    } else {
      const newInfo = {
        fakeid,
        completed: publish_list.length === 0,
        count: msgCount,
        articles: articleCount,
        nickname: account.nickname,
        round_head_img: account.round_head_img,
        total_count,
        create_time: Math.round(Date.now() / 1000),
        update_time: Math.round(Date.now() / 1000),
      }
      db.prepare('INSERT INTO info (fakeid, data) VALUES (?, ?)').run(fakeid, JSON.stringify(newInfo))
    }
  })

  doUpdate()
  return { ok: true }
})
