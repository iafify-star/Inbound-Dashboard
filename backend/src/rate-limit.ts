/**
 * حد الطلبات على /api فقط: 30 طلب لكل IP في الدقيقة.
 * اللوحة الحية بتقرأ الشيت، فالملف ده مش هيأثر على العرض المحلي.
 *
 * السيرفرلس على Vercel بيعدّ لكل instance. لو محتاج حد عالمي بعدين: Upstash.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 30
};

export function clientKey(req: { headers?: Record<string, string | string[] | undefined> }) {
  const raw = req.headers?.["x-forwarded-for"] ?? req.headers?.["x-real-ip"] ?? "local";
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value).split(",")[0].trim() || "local";
}

/** true = ارفض الطلب بـ 429 */
export function isRateLimited(key: string, max = RATE_LIMIT.maxRequests, windowMs = RATE_LIMIT.windowMs) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > max;
}
