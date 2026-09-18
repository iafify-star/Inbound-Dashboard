/**
 * =============================================================================
 * ملف السويتشات — عدّل من هنا بإيدك
 * =============================================================================
 *
 * الموقع دلوقتي واقف على الشيت الحي (mode = "sheet").
 * فايربيس متجهز في الملفات، بس مش متصل. متعملش cut-over من هنا إلا بعد
 * ما تخلّص checklist في FIREBASE_PRODUCTION.md
 *
 * القيم المسموحة لـ mode:
 *   "sheet"     = يقرأ جوجل شيت مباشرة  ← استخدمها في العرض واللوكال
 *   "mock"      = يقرأ data/inbound.mock.json أو /api/inbound
 *   "firebase"  = نفس شكل الداتا، ولسه مش متصل فعلياً
 *
 * قبل أي برزنتيشن: سيّب القيم زي ما هي تحت.
 * لو غيّرت mode لـ firebase دلوقتي، الشاشة هتسيب الشيت الحي.
 */
window.INBOUND_CONFIG = {
  // غيّر المصدر من هنا فقط. باقي الصفحات بتقرأ القيمة دي.
  mode: "sheet",

  // روابط الباك الموك. مش بتتشغل والـ mode = sheet
  api: {
    snapshot: "/api/inbound",
    settings: "/api/settings",
    mockFile: "/data/inbound.mock.json"
  },

  auth: {
    // false = الصفحة تفتح من غير login (مطلوب للعرض)
    // true  = يحول الموظف على login.html — متشغّلهاش قبل ما تملى الإيميلات
    required: false,
    loginPage: "login.html"
  },

  firebase: {
    // الاتنين false لحد ما Auth + Rules + sync يشتغلوا على preview
    enabled: false,
    ready: false,
    // حط apiKey و appId هنا وقت الربط. متفعلش enabled قبل ما تملاهم.
    config: {
      apiKey: "",
      authDomain: "inbound-receiving-dashboard.firebaseapp.com",
      projectId: "inbound-receiving-dashboard",
      storageBucket: "inbound-receiving-dashboard.firebasestorage.app",
      messagingSenderId: "77518389932",
      appId: ""
    }
  }
};
