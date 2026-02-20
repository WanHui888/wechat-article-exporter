import { request } from '#shared/utils/request';

interface UrlQuery {
  url: string;
}

export default defineEventHandler(async event => {
  let { url } = getQuery<UrlQuery>(event);

  const name = await request('/api/web/misc/accountname?url=' + encodeURIComponent(url));
  if (!name) {
    return {
      base_resp: {
        ret: -1,
        err_msg: 'url解析公众号名称失败',
      },
    };
  }

  const originalResp = await request(`/api/web/mp/searchbiz?keyword=${name}&size=20`, {
    headers: {
      'X-Auth-Key': getHeader(event, 'X-Auth-Key')!,
      Cookie: getHeader(event, 'Cookie')!,
    },
  });
  if (originalResp.base_resp.ret !== 0) {
    return originalResp;
  }

  let resp = JSON.parse(JSON.stringify(originalResp));
  resp.list = resp.list.filter((item: any) => item.nickname === name);
  resp.total = resp.list.length;

  if (resp.list.length === 0) {
    resp.base_resp.ret = -1;
    resp.base_resp.err_msg = '根据解析的名称搜索公众号失败';
    resp.resolved_name = name;
    resp.original_resp = originalResp;
  }

  return resp;
});
