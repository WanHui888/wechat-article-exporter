import { getTokenFromStore } from '~/server/utils/CookieStore'
import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const token = await getTokenFromStore(event)

  const query = getQuery(event)
  const keyword = query.keyword as string
  const begin = Number(query.begin) || 0
  const size = Number(query.size) || 5

  const params: Record<string, string | number> = {
    action: 'search_biz',
    begin,
    count: size,
    query: keyword,
    token: token!,
    lang: 'zh_CN',
    f: 'json',
    ajax: '1',
  }

  return proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/searchbiz',
    query: params,
    parseJson: true,
  }).catch(() => ({
    base_resp: { ret: -1, err_msg: '搜索公众号接口失败，请重试' },
  }))
})
