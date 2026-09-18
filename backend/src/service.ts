/**
 * قارئ الموك. بيتنادى من /api/inbound
 * مش بيشتغل واللوحة على mode=sheet
 *
 * بعد الربط: بدّل الجسم بقراءة وثيقة inbound/live من فايربيس Admin
 * ومترجّعش الشيت من هنا للفرونت.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { InboundSnapshot } from "./types.js";

const MOCK_FILE = join(process.cwd(), "data", "inbound.mock.json");

export function getInboundSnapshot(): InboundSnapshot {
  const data = JSON.parse(readFileSync(MOCK_FILE, "utf8")) as InboundSnapshot;
  return {
    ...data,
    source: "mock",
    updatedAt: new Date().toISOString()
  };
}

export function getAppSettings() {
  return getInboundSnapshot().settings;
}
