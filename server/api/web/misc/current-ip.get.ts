import type { H3Event } from 'h3'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  return { ip }
})

function getClientIp(event: H3Event): string {
  const req = event.node.req

  let ip: string | string[] | undefined = req.headers['x-forwarded-for'] || ''

  if (Array.isArray(ip)) {
    ip = ip[0]
  }
  if (typeof ip === 'string') {
    ip = ip.split(',')[0]!.trim()
  }

  if (!ip) {
    ip = req.socket.remoteAddress || ''
  }

  if (ip?.startsWith('::ffff:')) {
    ip = ip.slice(7)
  }

  return ip || 'unknown'
}
