export const ALLOWED_EVENT_TYPES = new Set([
  'card_opened', 'filter_used', 'api_request', 'ingest_retry_queued', 'guardrail_alert', 'unknown_status_seen', 'ingest_run', 'digest_delayed', 'rut_submitted', 'profile_built', 'aha_viewed', 'signup_completed', 'profile_refined', 'radar_activated', 'duplicate_rut_signup', 'profile_enriched', 'lookup_rate_limited'
]);

const buckets = new Map<string, number[]>();
export function validateEventType(type: string): boolean { return ALLOWED_EVENT_TYPES.has(type); }
export function rateLimit(key: string, now = Date.now(), limit = 60): boolean {
  const windowStart = now - 60_000;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= limit) { buckets.set(key, hits); return false; }
  hits.push(now); buckets.set(key, hits); return true;
}
export function resetRateLimits(): void { buckets.clear(); }
