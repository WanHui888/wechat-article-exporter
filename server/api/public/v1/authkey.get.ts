import { getMpCookie } from '~/server/kv/cookie';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';

export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);

  // 这里进行服务器验证，确定请求中的 auth-key 是否还有效
  const cookie = await getMpCookie(authKey);

  if (authKey && cookie) {
    return {
      code: 0,
      data: authKey,
    };
  } else {
    return {
      code: -1,
      msg: 'AuthKey not found',
    };
  }
});
