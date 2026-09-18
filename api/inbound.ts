/**
 * GET /api/inbound
 * بيرجع الموك. اللوحة المحلية مش بتستخدمه والـ mode = sheet
 * لو هتجرب الباك بإيدك: افتح /api/inbound بعد رفع Vercel أو سيرفر Node
 */
import { getInboundSnapshot } from "../backend/src/service.js";
import { clientKey, isRateLimited } from "../backend/src/rate-limit.js";

export default function handler(req: { method?: string; headers?: Record<string, string | string[] | undefined> }, res: {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void; end(): void };
}) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Inbound-Source", "mock");

  if (isRateLimited(clientKey(req))) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  if (req.method && req.method !== "GET") {
    res.status(405).end();
    return;
  }

  try {
    res.status(200).json(getInboundSnapshot());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inbound snapshot failed";
    res.status(500).json({ error: message });
  }
}
