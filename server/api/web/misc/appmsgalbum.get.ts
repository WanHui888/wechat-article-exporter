import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const fakeid = query.fakeid as string
  const album_id = query.album_id as string
  const isReverse = (query.is_reverse as string) || '0'
  const begin_msgid = query.begin_msgid as string | undefined
  const begin_itemidx = query.begin_itemidx as string | undefined
  const count = Number(query.count) || 20

  const params: Record<string, string | number | undefined> = {
    action: 'getalbum',
    __biz: fakeid,
    album_id,
    begin_msgid,
    begin_itemidx,
    count,
    is_reverse: isReverse,
    f: 'json',
  }

  return proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/mp/appmsgalbum',
    query: params,
    parseJson: true,
  }).catch(() => ({
    base_resp: { ret: -1, err_msg: '获取合集接口失败，请重试' },
  }))
})
