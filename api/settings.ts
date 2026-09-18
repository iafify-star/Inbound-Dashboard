/**
 * GET /api/settings
 * إعدادات الموك (التحديث والتصدير). مش مطلوب للعرض من الشيت.
 */
import { getAppSettings } from "../backend/src/service.js";

export default function handler(_req: unknown, res: {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).json(getAppSettings());
}
