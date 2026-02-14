/**
 * WeChat MP API client (frontend)
 */

const WEB_API = '/api/web'

function getAuthHeaders(): Record<string, string> {
  if (import.meta.server) return {}
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getArticleList(fakeid: string, begin = 0, keyword = '', size = 5) {
  return $fetch<any>(`${WEB_API}/mp/appmsgpublish`, {
    params: { id: fakeid, begin, keyword, size },
    headers: getAuthHeaders(),
  })
}

export async function getAccountList(begin = 0, keyword: string, size = 5) {
  return $fetch<any>(`${WEB_API}/mp/searchbiz`, {
    params: { begin, keyword, size },
    headers: getAuthHeaders(),
  })
}

export async function searchByUrl(url: string) {
  return $fetch<any>(`${WEB_API}/mp/searchbyurl`, {
    params: { url },
    headers: getAuthHeaders(),
  })
}

export async function getComment(params: {
  __biz: string
  comment_id: string
  uin: string
  key: string
  pass_ticket: string
}) {
  return $fetch<any>(`${WEB_API}/misc/comment`, { params, headers: getAuthHeaders() })
}

export async function getAlbum(params: {
  fakeid: string
  album_id: string
  is_reverse?: string
  count?: number
  begin_msgid?: string
  begin_itemidx?: string
}) {
  return $fetch<any>(`${WEB_API}/misc/appmsgalbum`, { params, headers: getAuthHeaders() })
}

export async function getArticleListWithCredential(fakeid: string, begin: number, credential: {
  uin: string
  key: string
  pass_ticket: string
}) {
  return $fetch<any>(`${WEB_API}/mp/profile_ext_getmsg`, {
    params: {
      id: fakeid,
      begin,
      ...credential,
    },
    headers: getAuthHeaders(),
  })
}

export async function getMpInfo() {
  return $fetch<{ nick_name: string; head_img: string }>(`${WEB_API}/mp/info`, {
    headers: getAuthHeaders(),
  })
}

export async function getCurrentIp() {
  return $fetch<{ ip: string }>(`${WEB_API}/misc/current-ip`, {
    headers: getAuthHeaders(),
  })
}
