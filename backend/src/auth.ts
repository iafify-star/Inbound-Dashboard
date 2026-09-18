/**
 * فحص إيميل الموظف.
 * القائمة اليدوية: firebase/employees.allowlist.json
 * انسخ نفس الإيميلات/الدومينات في firestore.rules لأن القواعد مش بتقرأ JSON.
 */
export interface EmployeeAllowlist {
  emails: string[];
  domains: string[];
}

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function isEmployeeEmail(email: string, allowlist: EmployeeAllowlist) {
  const value = normalizeEmail(email);
  if (!value || !value.includes("@")) return false;
  if (allowlist.emails.map(normalizeEmail).includes(value)) return true;
  const domain = value.split("@")[1];
  return allowlist.domains.map(d => d.toLowerCase()).includes(domain);
}
