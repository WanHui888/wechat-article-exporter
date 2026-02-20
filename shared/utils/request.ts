/**
 * 封装 $fetch 无重试请求
 */
export const request = $fetch.create({
  retry: 0,
  method: 'GET',
  async onResponse({ request, response, options, error }) {
    // 需要注意的是，这里有可能是客户端和服务器端调用
  },
  async onResponseError({ request, response, options, error }) {},
});
