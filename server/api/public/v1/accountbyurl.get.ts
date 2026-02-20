import { request } from '#shared/utils/request';

interface UrlQuery {
  url: string;
}

export default defineEventHandler(async event => {
  const { url } = getQuery<UrlQuery>(event);

  return await request('/api/web/mp/searchbyurl?url=' + encodeURIComponent(url), {
    headers: {
      'X-Auth-Key': getHeader(event, 'X-Auth-Key')!,
      Cookie: getHeader(event, 'Cookie')!,
    },
  });
});
