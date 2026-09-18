/**
 * شكل الداتا النهائي — نفس اللي الفرونت بيفهمه.
 *
 * أي مصدر (شيت / موك / فايربيس) لازم يرجّع InboundSnapshot.
 * لو هتغيّر اسم حقل هنا، غيّره كمان في:
 *   - dashboard.html → normalizeRow()
 *   - data/inbound.mock.json
 *   - بعدين وثيقة inbound/live في فايربيس
 */
export type DataSource = "mock" | "sheet" | "firebase";

export interface ReceiptRow {
  date: string;
  vendor: string;
  ro: string;
  asn: string;
  accuracy: string;
  facility: string;
  qty: number;
  status: string;
  arrival: string | null;
  emp: string;
  cars: number;
  product: number | null;
}

export interface CapacityRow {
  date: string;
  facility: string;
  capacity: number;
}

export interface AppSettings {
  refreshMs: number;
  allowPublicRead: boolean;
  features: {
    export: boolean;
    compare: boolean;
    print: boolean;
  };
}

export interface InboundSnapshot {
  source: DataSource;
  updatedAt: string;
  receipts: ReceiptRow[];
  capacity: CapacityRow[];
  settings: AppSettings;
}
