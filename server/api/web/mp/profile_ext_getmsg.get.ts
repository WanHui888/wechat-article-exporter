import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const begin = Number(query.begin) || 0
  const size = Number(query.size) || 10

  const params: Record<string, string | number> = {
    action: 'getmsg',
    __biz: query.id as string,
    offset: begin,
    count: size,
    uin: query.uin as string,
    key: query.key as string,
    pass_ticket: query.pass_ticket as string,
    f: 'json',
    is_ok: '1',
    scene: '124',
  }

  return proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/mp/profile_ext',
    query: params,
    parseJson: true,
  }).catch(() => ({
    base_resp: { ret: -1, err_msg: '搜索公众号接口失败，请重试' },
  }))
})
