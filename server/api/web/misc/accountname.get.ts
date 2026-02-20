import * as cheerio from 'cheerio';
import { USER_AGENT } from '~/config';

interface AccountNameQuery {
  url: string;
}

/**
 * 根据文章 url 获取公众号名称
 */
export default defineEventHandler(async event => {
  let { url } = getQuery<AccountNameQuery>(event);
  url = decodeURIComponent(url);

  const rawHtml = await fetch(url, {
    headers: {
      Referer: 'https://mp.weixin.qq.com/',
      Origin: 'https://mp.weixin.qq.com',
      'User-Agent': USER_AGENT,
    },
  }).then(res => res.text());

  const $ = cheerio.load(rawHtml);
  return $('.wx_follow_nickname:first').text().trim();
});
