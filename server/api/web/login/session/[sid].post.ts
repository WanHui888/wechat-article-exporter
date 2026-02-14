import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const { sid } = event.context.params!

  const body: Record<string, string | number> = {
    userlang: 'zh_CN',
    redirect_url: '',
    login_type: 3,
    sessionid: sid,
    token: '',
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
  }

  return proxyMpRequest({
    event,
    method: 'POST',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/bizlogin',
    query: { action: 'startlogin' },
    body,
    action: 'start_login',
  })
})
