function padLeft(num: number, len: number = 2) {
  if (num.toString().length >= len) {
    return num.toString()
  }
  return '0'.repeat(len - num.toString().length) + num.toString()
}

export function formatAlbumTime(timestamp: number) {
  const currentSeconds = Math.round(new Date().getTime() / 1000)
  const now = new Date(1000 * currentSeconds)
  const o = new Date(1000 * timestamp)
  const r = {
    year: o.getFullYear(),
    month: padLeft(o.getMonth() + 1),
    date: padLeft(o.getDate()),
  }

  now.setHours(0)
  now.setMinutes(0)
  now.setSeconds(0)
  const i = now.getTime() / 1000
  now.setDate(1)
  now.setMonth(0)
  const s = now.getTime() / 1000

  return [
    { date: i, text: '今天' },
    { date: i - 86400, text: '昨天' },
    { date: i - 172800, text: '前天' },
    { date: i - 518400, text: Math.floor((i - timestamp) / 86400) + '天前' },
    { date: i - 1209600, text: '1周前' },
    { date: s, text: r.month + '/' + r.date },
    { date: 0, text: r.year + '/' + r.month + '/' + r.date },
  ].reduce(function (result: string, item) {
    if (!result && timestamp >= item.date) {
      result = item.text
    }
    return result
  }, '')
}
