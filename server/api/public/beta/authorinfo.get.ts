/**
 * 搜索公众号主体信息
 */

import { proxyMpRequest } from '~/server/utils/proxy-request';

interface AuthorInfoQuery {
  fakeid: string;
}

export default defineEventHandler(async event => {
  const { fakeid } = getQuery<AuthorInfoQuery>(event);

  const params: Record<string, string | number> = {
    wxtoken: '777',
    biz: fakeid,
    __biz: fakeid,
    x5: 0,
    f: 'json',
  };

  return proxyMpRequest({
    event: event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/mp/authorinfo',
    query: params,
    parseJson: true,
  }).catch(e => {
    return {
      base_resp: {
        ret: -1,
        err_msg: '获取公众号主体信息接口失败，请重试',
      },
    };
  });
});
