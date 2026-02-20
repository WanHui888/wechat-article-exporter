/**
 * 搜索公众号文章列表接口
 */

import { proxyMpRequest } from '~/server/utils/proxy-request';

interface SearchBizQuery {
  begin?: number;
  size?: number;
  id: string;
  uin: string;
  key: string;
  pass_ticket: string;
}

export default defineEventHandler(async event => {
  const query = getQuery<SearchBizQuery>(event);
  const begin: number = query.begin || 0;
  const size: number = query.size || 10;

  const params: Record<string, string | number> = {
    action: 'getmsg',
    __biz: query.id,
    offset: begin,
    count: size,
    uin: query.uin,
    key: query.key,
    pass_ticket: query.pass_ticket,
    f: 'json',
    is_ok: '1',
    scene: '124',
  };

  return proxyMpRequest({
    event: event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/mp/profile_ext',
    query: params,
    parseJson: true,
  }).catch(e => {
    return {
      base_resp: {
        ret: -1,
        err_msg: '搜索公众号接口失败，请重试',
      },
    };
  });
});
