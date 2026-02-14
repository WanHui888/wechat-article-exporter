/**
 * url是否是合法的微信公众号文章url
 */
export function urlIsValidMpArticle(url: string) {
  try {
    return new URL(url).hostname === 'mp.weixin.qq.com'
  } catch (e) {
    return false
  }
}
