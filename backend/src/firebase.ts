/**
 * Admin SDK — سيبه مطفي.
 * متستدعوش من dashboard.html أبداً.
 * وقت الربط: حط service account في Environment السيرفر بس، مش في الفرونت.
 */
export const firebaseReady = false;

export function assertFirebaseReady() {
  if (!firebaseReady) {
    throw new Error("Firebase Admin مطفي. سيّب mode=sheet لحد ما Auth والقواعد والـ sync يشتغلوا.");
  }
}
