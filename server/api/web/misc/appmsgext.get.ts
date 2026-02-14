import { proxyMpRequest } from '~/server/utils/proxy-request'

/**
 * Proxy endpoint to fetch article metadata (read count, likes, shares, etc.)
 * from WeChat's getappmsgext API.
 *
 * Required params: __biz, mid, idx, sn, uin, key, pass_ticket
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, string>

  const { __biz, mid, idx, sn, uin, key, pass_ticket } = query

  if (!__biz || !mid || !idx || !uin || !key || !pass_ticket) {
    throw createError({ statusCode: 400, statusMessage: '缺少必要参数' })
  }

  const params: Record<string, string | number> = {
    action: 'getappmsgext',
    __biz,
    mid,
    idx,
    sn: sn || '',
    uin,
    key,
    pass_ticket,
    f: 'json',
    is_need_ad: 0,
    comment_id: '',
    is_need_reward: 0,
    both_hierarchical_comment: 0,
    reward_uin_count: 0,
    send_time: '',
    msg_daily_idx: '',
    is_original: '',
    is_only_read: 1,
    req_id: '',
    pass_ticket_only_read: '',
    is_temp_url: 0,
    item_show_type: 0,
  }

  try {
    const data = await proxyMpRequest({
      event,
      method: 'GET',
      endpoint: 'https://mp.weixin.qq.com/mp/getappmsgext',
      query: params,
      parseJson: true,
    })

    return { success: true, data }
  } catch (e: any) {
    return {
      success: false,
      error: e.message || '获取文章数据失败',
    }
  }
})
