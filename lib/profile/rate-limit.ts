const buckets = new Map<string, number[]>();
export function lookupRateLimit(ip: string, sessionId: string, now = Date.now()): boolean {
  return hit(`ip:${ip}`, 10, now) && hit(`session:${sessionId}`, 3, now);
}
function hit(key: string, limit: number, now: number) { const start = now - 60*60*1000; const hits = (buckets.get(key) ?? []).filter(t => t > start); if (hits.length >= limit) { buckets.set(key, hits); return false; } hits.push(now); buckets.set(key, hits); return true; }
export function resetLookupRateLimits() { buckets.clear(); }
