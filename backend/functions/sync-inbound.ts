/**
 * فنكشن واحدة هتحتاجوها بعدين — مش دلوقتي.
 *
 * الشغل: اقرأ الشيت من السيرفر → اعمل hash
 * لو الداتا متغيرتش: اخرج من غير كتابة (عشان الليمت)
 * لو اتغيرت: اكتب وثيقة واحدة inbound/live
 *
 * الجدول المقترح: كل 1–2 دقيقة. مش كل 10 ثواني.
 * الفرونت بعدها يعمل onSnapshot مرة واحدة، مش setInterval.
 *
 * متعملش deploy قبل ما تملى بيانات الموظفين وتعمل preview.
 */
export async function syncInboundToFirestore() {
  throw new Error("المزامنة مش متوصلة. امشِ على FIREBASE_PRODUCTION.md");
}
