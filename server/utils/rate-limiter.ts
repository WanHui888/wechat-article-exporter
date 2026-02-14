interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60_000)

export interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {},
): { allowed: boolean; remaining: number; resetAt: number } {
  const { windowMs = 60_000, maxRequests = 60 } = options
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++
  const allowed = entry.count <= maxRequests
  return { allowed, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt }
}

// WeChat API specific rate limiter - global queue
interface QueuedRequest {
  resolve: (value: void) => void
  userId: number
  timestamp: number
}

class WeChatRateLimiter {
  private queue: QueuedRequest[] = []
  private processing = false
  private lastRequestTime = 0
  private minInterval = 1000 // minimum 1s between requests
  private slowdownUntil = 0
  private slowdownInterval = 5000 // 5s when slowed down

  async enqueue(userId: number): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ resolve, userId, timestamp: Date.now() })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const interval = now < this.slowdownUntil ? this.slowdownInterval : this.minInterval
      const elapsed = now - this.lastRequestTime

      if (elapsed < interval) {
        await new Promise(r => setTimeout(r, interval - elapsed))
      }

      const request = this.queue.shift()
      if (request) {
        this.lastRequestTime = Date.now()
        request.resolve()
      }
    }

    this.processing = false
  }

  slowdown(durationMs: number = 60_000) {
    this.slowdownUntil = Date.now() + durationMs
    this.slowdownInterval = Math.min(this.slowdownInterval * 2, 30_000)
  }

  resetSpeed() {
    this.slowdownInterval = 5000
  }

  setMinInterval(ms: number) {
    this.minInterval = ms
  }
}

export const wechatRateLimiter = new WeChatRateLimiter()
