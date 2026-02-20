/**
 * 查询当前ip
 */
import { H3Event } from 'h3';

export default defineEventHandler(async event => {
  // 查询用户的当前ip并返回
  const clientIp = getClientIp(event);

  return {
    ip: clientIp,
  };
});

function getClientIp(event: H3Event) {
  const req = event.node.req;

  // 优先从 x-forwarded-for 获取（常见于代理/Nginx/Cloudflare 等场景）
  let ip = req.headers['x-forwarded-for'] || '';

  // x-forwarded-for 可能是字符串或数组，也可能包含多个 IP
  if (Array.isArray(ip)) {
    ip = ip[0];
  }
  if (typeof ip === 'string') {
    ip = ip.split(',')[0].trim();
  }

  // fallback 到 socket 或 connection 的 remoteAddress
  if (!ip) {
    ip = req.socket.remoteAddress || req.connection?.remoteAddress || '';
  }

  // 处理 IPv6 映射的 IPv4 地址（本地开发常见 ::ffff:127.0.0.1）
  if (ip?.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  // 最终 fallback
  return ip || 'unknown';
}
