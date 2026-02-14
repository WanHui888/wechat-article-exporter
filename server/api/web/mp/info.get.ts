import { getTokenFromStore } from '~/server/utils/CookieStore'
import { proxyMpRequest } from '~/server/utils/proxy-request'

export default defineEventHandler(async (event) => {
  const token = await getTokenFromStore(event)

  const html: string = await proxyMpRequest({
    event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/home',
    query: {
      t: 'home/index',
      token: token!,
      lang: 'zh_CN',
    },
  }).then(resp => resp.text())

  let nick_name = ''
  const nicknameMatch = html.match(/wx\.cgiData\.nick_name\s*?=\s*?"(?<nick_name>[^"]+)"/)
  if (nicknameMatch?.groups?.nick_name) {
    nick_name = nicknameMatch.groups.nick_name
  }

  let head_img = ''
  const headImgMatch = html.match(/wx\.cgiData\.head_img\s*?=\s*?"(?<head_img>[^"]+)"/)
  if (headImgMatch?.groups?.head_img) {
    head_img = headImgMatch.groups.head_img
  }

  return { nick_name, head_img }
})
