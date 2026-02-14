import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const { __biz, comment_id, uin, key, pass_ticket } = getQuery(event) as Record<string, string>

  const params: Record<string, string | number> = {
    action: 'getcomment',
    __biz,
    comment_id,
    uin,
    key,
    pass_ticket,
    limit: 1000,
    f: 'json',
  }

  const resp: Response = await proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/mp/appmsg_comment',
    query: params,
    parseJson: false,
  })
  return new Response(resp.body, {
    headers: { 'content-type': 'application/json' },
  })
})
