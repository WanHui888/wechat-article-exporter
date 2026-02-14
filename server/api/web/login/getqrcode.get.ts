import { getCookiesFromRequest } from '~/server/utils/CookieStore'
import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const cookie = getCookiesFromRequest(event)

  return proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/scanloginqrcode',
    query: {
      action: 'getqrcode',
      random: Date.now(),
    },
    cookie,
  })
})
