/**
 * =============================================================================
 * طبقة الداتا — التيم يعدّل هنا لو هتغيّر مصدر البيانات
 * =============================================================================
 *
 * كل الصفحة بتطلب نفس الشكل:
 *   { source, updatedAt, receipts[], capacity[], settings }
 *
 * load() بتختار المصدر حسب INBOUND_CONFIG.mode
 *   sheet    → InboundSheetAdapter جوّه dashboard.html (الشيت الحي)
 *   mock     → /api/inbound أو ملف data/inbound.mock.json
 *   firebase → جاهز كاسم، مش متصل. متفتحوش في العرض.
 *
 * listen() متعملوش دلوقتي. ده مكان onSnapshot بعد الربط
 *   عشان التحديث يبقى لحظي من غير polling كل 30 ثانية.
 */
(function (global) {
  const DEFAULT_SETTINGS = {
    refreshMs: 30000,
    allowPublicRead: true,
    features: { export: true, compare: true, print: true }
  };

  function cfg() {
    return global.INBOUND_CONFIG || {};
  }

  async function getJson(url) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(url + sep + "_ts=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
    return res.json();
  }

  // لو هتضيف عمود جديد للداتا، لازم يظهر هنا كمان في receipts[]
  function normalizeSnapshot(raw, source) {
    if (!raw || !Array.isArray(raw.receipts)) throw new Error("Invalid inbound snapshot");
    return {
      source: raw.source || source,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      receipts: raw.receipts,
      capacity: Array.isArray(raw.capacity) ? raw.capacity : [],
      settings: Object.assign({}, DEFAULT_SETTINGS, raw.settings || {})
    };
  }

  async function loadMock() {
    const api = (cfg().api) || {};
    try {
      return normalizeSnapshot(await getJson(api.snapshot || "/api/inbound"), "mock");
    } catch (err) {
      console.info("[inbound] الـ API مش شغال محلياً — بنقرأ ملف الموك.", err);
      return normalizeSnapshot(await getJson(api.mockFile || "/data/inbound.mock.json"), "mock");
    }
  }

  async function loadFirebase() {
    const fb = cfg().firebase || {};
    if (!fb.enabled || !fb.ready) {
      console.info("[inbound] فايربيس متجهز ومش متصل. العرض يفضل على الشيت.");
      const snap = await loadMock();
      snap.source = "firebase";
      return snap;
    }
    throw new Error("Firebase client read is not connected yet.");
  }

  async function loadSheet() {
    if (!global.InboundSheetAdapter || typeof global.InboundSheetAdapter.load !== "function") {
      throw new Error("Sheet adapter is not available");
    }
    const snap = await global.InboundSheetAdapter.load();
    return normalizeSnapshot(snap, "sheet");
  }

  // نقطة الدخول الوحيدة للوحة. متعملش fetch للشيت من مكان تاني.
  async function load() {
    const mode = cfg().mode || "sheet";
    if (mode === "mock") return loadMock();
    if (mode === "firebase") return loadFirebase();
    return loadSheet();
  }

  // بعد الربط: بدّل الجسم بـ onSnapshot على inbound/live وارجع unsubscribe
  function listen(onChange) {
    if (typeof onChange !== "function") return function unsubscribe() {};
    load().then(onChange).catch(function (err) {
      console.warn("[inbound] فشل أول تحميل — الصفحة تفضل مفتوحة.", err);
    });
    return function unsubscribe() {};
  }

  global.InboundClient = { load, listen, settings: DEFAULT_SETTINGS };
})(window);
