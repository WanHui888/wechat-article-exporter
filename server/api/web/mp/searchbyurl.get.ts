import { getTokenFromStore } from '~/server/utils/CookieStore'
import { proxyMpRequest } from '~/server/utils/proxy-request'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url: string }

  // Step 1: Extract account name from article URL
  let name = ''
  try {
    const rawHtml = await fetch(decodeURIComponent(url), {
      headers: {
        Referer: 'https://mp.weixin.qq.com/',
        Origin: 'https://mp.weixin.qq.com',
        'User-Agent': USER_AGENT,
      },
    }).then(res => res.text())

    // Extract nickname from HTML using regex (avoiding cheerio dependency)
    const match = rawHtml.match(/class="wx_follow_nickname"[^>]*>([^<]+)</)
    if (match) {
      name = match[1]!.trim()
    }
    // Also try js_name for newer templates
    if (!name) {
      const match2 = rawHtml.match(/var\s+nickname\s*=\s*['"]([^'"]+)['"]/)
      if (match2) name = match2[1]!.trim()
    }
    // Also try profile_nickname
    if (!name) {
      const match3 = rawHtml.match(/profile_nickname\s*=\s*['"]([^'"]+)['"]/)
      if (match3) name = match3[1]!.trim()
    }
  } catch {
    // ignore
  }

  if (!name) {
    return {
      base_resp: { ret: -1, err_msg: 'URL解析公众号名称失败' },
    }
  }

  // Step 2: Search for the account using the extracted name
  const token = await getTokenFromStore(event)

  const searchParams: Record<string, string | number> = {
    action: 'search_biz',
    begin: 0,
    count: 20,
    query: name,
    token: token!,
    lang: 'zh_CN',
    f: 'json',
    ajax: '1',
  }

  try {
    const originalResp: any = await proxyMpRequest({
      event,
      method: 'GET',
      endpoint: 'https://mp.weixin.qq.com/cgi-bin/searchbiz',
      query: searchParams,
      parseJson: true,
    })

    if (originalResp.base_resp?.ret !== 0) {
      return originalResp
    }

    const resp = JSON.parse(JSON.stringify(originalResp))
    resp.list = resp.list.filter((item: any) => item.nickname === name)
    resp.total = resp.list.length

    if (resp.list.length === 0) {
      resp.base_resp.ret = -1
      resp.base_resp.err_msg = '根据解析的名称搜索公众号失败'
      resp.resolved_name = name
      resp.original_resp = originalResp
    }

    return resp
  } catch {
    return {
      base_resp: { ret: -1, err_msg: '搜索公众号失败，请重试' },
    }
  }
})
