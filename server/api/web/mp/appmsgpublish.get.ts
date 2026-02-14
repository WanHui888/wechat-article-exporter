import { getTokenFromStore } from '~/server/utils/CookieStore'
import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const token = await getTokenFromStore(event)

  const query = getQuery(event)
  const id = query.id as string
  const keyword = (query.keyword as string) || ''
  const begin = Number(query.begin) || 0
  const size = Number(query.size) || 5

  const isSearching = !!keyword

  const params: Record<string, string | number> = {
    sub: isSearching ? 'search' : 'list',
    search_field: isSearching ? '7' : 'null',
    begin,
    count: size,
    query: keyword,
    fakeid: id,
    type: '101_1',
    free_publish_type: 1,
    sub_action: 'list_ex',
    token: token!,
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  }

  return proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/appmsgpublish',
    query: params,
    parseJson: true,
  }).catch((e) => {
    console.error(e)
    return {
      base_resp: { ret: -1, err_msg: '获取文章列表接口失败，请重试' },
    }
  })
})
