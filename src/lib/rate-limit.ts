// In-memory sliding-window rate limiter.
// For production behind multiple instances: swap with Upstash Redis.
//
// Usage: const { allowed, retryAfterSec } = rateLimit(ip, 10, 60)

interface Bucket {
  hits: number[] // timestamps (ms)
}

const buckets = new Map<string, Bucket>()

// Periodic cleanup to bound memory
const CLEAN_INTERVAL_MS = 5 * 60_000
let lastCleanup = Date.now()

function cleanup(now: number, windowMs: number) {
  if (now - lastCleanup < CLEAN_INTERVAL_MS) return
  lastCleanup = now
  for (const [k, v] of buckets) {
    v.hits = v.hits.filter(t => now - t < windowMs)
    if (v.hits.length === 0) buckets.delete(k)
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const windowMs = windowSec * 1000
  const now = Date.now()
  cleanup(now, windowMs)

  let b = buckets.get(key)
  if (!b) {
    b = { hits: [] }
    buckets.set(key, b)
  }
  // Prune old hits
  b.hits = b.hits.filter(t => now - t < windowMs)

  if (b.hits.length >= limit) {
    const oldest = b.hits[0]
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000)
    return { allowed: false, retryAfterSec, remaining: 0 }
  }

  b.hits.push(now)
  return { allowed: true, retryAfterSec: 0, remaining: limit - b.hits.length }
}
