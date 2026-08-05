type Bucket = { count: number; resetAt: number }

// In-process only — fine here because the app runs as a single node process
// (see ubuntuserver/tne.service). Would need shared storage behind >1 instance.
const buckets = new Map<string, Bucket>()

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

/**
 * Fixed-window limiter. Returns false once `key` has been seen `limit` times
 * within `windowMs`, and counts the rejected attempt too, so a caller that
 * keeps hammering keeps the window alive.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size > 1000) prune(now)

  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  bucket.count++
  return bucket.count <= limit
}

/** Test seam — drops all windows. */
export function resetRateLimits(): void {
  buckets.clear()
}
