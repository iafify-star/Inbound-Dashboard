/**
 * =============================================================================
 * قفل الموظفين — مقفول دلوقتي
 * =============================================================================
 *
 * auth.required في inbound-config.js = false
 * يعني الملف ده مش هيعمل حاجة، واللوحة هتفتح عادي في العرض.
 *
 * لما تيجوا تقفلوا الموقع:
 *   1) املوا firebase/employees.allowlist.json
 *   2) انسخوا الإيميلات في firebase/firestore.rules
 *   3) بعدين خلوا auth.required = true
 *
 * القفل الحقيقي هو قواعد فايربيس، مش الصفحة دي.
 */
(function (global) {
  const cfg = global.INBOUND_CONFIG || {};
  const auth = cfg.auth || {};

  function currentPage() {
    return (location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
  }

  global.InboundSecurity = {
    required: function () {
      return auth.required === true;
    },
    gate: function () {
      // متشيلش الشرط ده. من غيره العرض هيروح login فاضي.
      if (auth.required !== true) return;
      if (currentPage() === "login.html") return;
      const session = global.sessionStorage.getItem("inbound-employee") || "";
      if (session) return;
      location.replace("login.html" + location.search + location.hash);
    }
  };

  global.InboundSecurity.gate();
})(window);
