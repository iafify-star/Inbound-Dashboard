# Inbound Receiving Dashboard — Firebase Production Runbook

This file is the only path from today’s live site to Firebase. Follow it in order. Do not flip production switches early.

## 1. Current production state — keep the site up

The live dashboard is **not** waiting on Firebase.

| Switch | File | Production value now | Meaning |
|---|---|---|---|
| Data source | `js/inbound-config.js` → `mode` | `"sheet"` | Browser reads the live Google Sheet |
| Firebase client | `js/inbound-config.js` → `firebase.enabled` | `false` | Firebase SDK is not started |
| Firebase ready | `js/inbound-config.js` → `firebase.ready` | `false` | Adapter stays mocked |
| Employee lock | `js/inbound-config.js` → `auth.required` | `false` | Anyone who has the URL can open the HTML |

The site stays up if Firebase is incomplete, if `/api/*` is down, or if a sheet refresh fails. A failed refresh keeps the last good data on screen.

**Do not change those four flags until section 8 is complete.**

---

## 2. Target architecture

```
Google Sheet  (source of truth, private)
        │
        │  one scheduled job, every 1–2 minutes
        │  write ONLY if the payload hash changed
        ▼
Firestore document  inbound/live   ← one JSON snapshot
        │
        │  one onSnapshot listener per open dashboard
        ▼
dashboard.html  (HTML stays as the UI)
```

Rules:

- The browser never talks to Google Sheets after go-live.
- The browser never polls Firestore every 30 seconds.
- Employees sign in. Security Rules reject everyone else.
- Writes happen only from the server job, never from the HTML.

Realtime Database (`/inbound/live`) is an optional alternative to that single Firestore document. Same idea: one blob, one listener.

---

## 3. How this stays realtime without burning quota

Polling is what eats limits. Live listeners plus a single document do not.

### What not to do

- Do not create one Firestore document per ASN and listen to the whole collection.
- Do not keep `setInterval(loadData, 30000)` after Firebase is live.
- Do not let every employee tab export the Google Sheet.
- Do not write `inbound/live` if the sheet did not change.

### Quota model

Assume 25 employees leave the dashboard open all day, and the sync job runs every 2 minutes.

| Action | Count | Why it stays small |
|---|---|---|
| Sync job reads the sheet | 720 / day | One server, not 25 browsers |
| Sync job writes Firestore | 0–720 / day | Skip write when hash is unchanged |
| Each employee first open | 1 read | One document |
| Each later update | 1 read / listener | Only when the document actually changes |

If the sheet is quiet for an hour, listeners cost almost nothing.

If you instead polled Firestore every 30 seconds: `25 users × 2 reads/min × 1440 min ≈ 72,000 reads/day`. That is how Spark/Blaze limits get eaten.

### After go-live, turn sheet polling off

When `mode` becomes `"firebase"` and `listen()` uses `onSnapshot`:

1. Remove or ignore `startAutoRefresh`.
2. Remove the `window` `focus` reload, or keep it only as a silent reconnect.
3. Let Firestore push the next snapshot.

The HTML already has `InboundClient.listen()` reserved for that. Do not activate it until Firebase is ready.

---

## 4. Files already in the repo

| File | Role |
|---|---|
| `js/inbound-config.js` | Production switches. Leave them off. |
| `js/inbound-client.js` | Sheet / mock / Firebase adapter |
| `js/inbound-security.js` | Employee gate. No-op while `auth.required` is false |
| `login.html` | Sign-in shell. Not enforced yet |
| `backend/src/types.ts` | Snapshot contract the UI already understands |
| `backend/src/service.ts` | Mock snapshot reader |
| `backend/src/auth.ts` | Email / domain allowlist helper |
| `backend/src/rate-limit.ts` | API rate limit (30 req / IP / minute) |
| `backend/src/firebase.ts` | Admin SDK stub. Off |
| `backend/functions/sync-inbound.ts` | Sheet → `inbound/live` template. Not deployed |
| `api/inbound.ts` | Mock API + rate limit |
| `api/settings.ts` | Settings endpoint |
| `firebase/firestore.rules` | Employee-only read, no client writes |
| `firebase/database.rules.json` | Same idea for Realtime Database |
| `firebase/storage.rules` | Storage locked |
| `firebase/employees.allowlist.json` | Fill this before locking the site |
| `firebase/firestore.indexes.json` | Empty on purpose (single document) |
| `firebase.json` | Firebase CLI entry |
| `vercel.json` | Security headers. Does not block the HTML |

---

## 5. Connect Firebase without taking the site down

Work in this order. After each step, open the live dashboard and confirm the sheet still loads.

### Step 1 — Firebase project

Project already named: `inbound-receiving-dashboard`.

In Firebase Console:

1. Enable **Authentication → Google**.
2. Enable **Firestore** (production mode).
3. Optional: enable **Realtime Database** only if you choose that instead of Firestore.
4. Authentication → Settings → **Authorized domains**: add the Vercel domain and `localhost`.
5. App Check: register the web app. Turn enforcement on only in step 8.

Do not deploy rules yet if the allowlist is empty.

### Step 2 — Employee allowlist

Edit `firebase/employees.allowlist.json`:

```json
{
  "emails": ["ibrahim@company.com"],
  "domains": ["company.com"]
}
```

Copy the same emails/domains into `firebase/firestore.rules` inside `employeeEmails()` and `employeeDomains()`.

Rules do not read the JSON file. The JSON is the checklist; the rules file is the lock.

Preferred later: custom claim `employee: true` via Admin SDK, then you can leave the email arrays empty.

### Step 3 — Security rules, still without flipping the HTML

```bash
firebase deploy --only firestore:rules,storage
```

This does **not** change `dashboard.html`. The site keeps reading the sheet.

If you deployed rules with an empty allowlist, Firestore is locked. The HTML still works because `mode` is `"sheet"`.

### Step 4 — Sync job (the only Cloud Function you need)

One scheduled function is enough. The dashboard does not need a function to render.

The function should:

1. Read Daily Receiving + Capacity with a **server** credential. Never put that credential in HTML.
2. Normalize rows to `backend/src/types.ts` (`InboundSnapshot`).
3. Hash the payload.
4. If hash == last hash, exit.
5. Write `inbound/live` with `{ source, updatedAt, receipts, capacity, settings, hash }`.

Schedule: every 1–2 minutes. Not every 10 seconds.

`backend/functions/sync-inbound.ts` is the placeholder. Fill it only when Admin SDK + sheet access are ready.

### Step 5 — Wire the HTML adapter, still off

In `js/inbound-config.js` put the web config values (`apiKey`, `appId`). Leave:

```js
mode: "sheet",
auth: { required: false },
firebase: { enabled: false, ready: false }
```

Deploy that if you want. The site still uses the sheet.

### Step 6 — Shadow test (Firebase in parallel)

On a **preview** Vercel URL or local copy only:

```js
mode: "firebase",
firebase: { enabled: true, ready: true }
```

Confirm:

- Sign-in works for an allowlisted employee.
- `onSnapshot` fills the same KPIs/charts/table.
- A sheet edit appears after the next successful sync.
- Production Vercel is still `mode: "sheet"`.

### Step 7 — Cut over production

Only after the preview URL is good:

```js
mode: "firebase",
auth: { required: true },
firebase: { enabled: true, ready: true }
```

Then:

- Stop sheet polling (`startAutoRefresh` / focus reload).
- Keep the last-good-snapshot fallback so a Firebase blip does not blank the page.

### Step 8 — Lock the public sheet

After cut-over is stable for a day:

- Remove “anyone with the link” from the Google Sheet.
- Share the sheet only with the service account used by the sync job.

If you lock the sheet **before** Firebase is live, production stops. Do this last.

---

## 6. Employee-only access

HTML hiding is not security. Firestore Rules are.

| Layer | File | When it starts working |
|---|---|---|
| Login page | `login.html` | After Auth is coded and `auth.required` is true |
| Client gate | `js/inbound-security.js` | Same moment |
| Real lock | `firebase/firestore.rules` | As soon as rules are deployed |
| API lock | `backend/src/auth.ts` + future token check | When `/api` is used in production |

Until `auth.required` is true, `inbound-security.js` does nothing. That is intentional so the site does not stop.

When you turn it on:

1. Allowlist must already have people.
2. Google sign-in must already work on the preview URL.
3. Then set `auth.required: true` and deploy.

If you flip `auth.required` first, every employee is sent to `login.html` and cannot enter.

---

## 7. Rate limiting

| Layer | Status | Limit |
|---|---|---|
| `backend/src/rate-limit.ts` | Ready | 30 requests / IP / minute on `/api/*` |
| `api/inbound.ts` | Wired | Returns HTTP 429 |
| Firestore Rules | Ready | Unauthenticated reads denied |
| App Check | Console only | Turn on at go-live |
| Client polling | Live today | 30s sheet refresh. Remove after Firebase listen |

The in-memory limiter is per serverless instance. For a hard global cap later, add Upstash Redis or Firebase App Check + function throttling. You do not need that while the HTML still talks to the sheet.

Do not rate-limit the Google Sheet from the browser. After go-live the browser should not see the sheet.

---

## 8. Go-live checklist

Do not cut over unless every line is yes.

- [ ] Allowlist emails/domains are filled in JSON **and** copied into rules
- [ ] Preview URL works with Firebase for a real employee
- [ ] A non-employee account cannot read `inbound/live`
- [ ] Sync job writes only when the hash changes
- [ ] Dashboard uses one `onSnapshot`, not a 30s poll
- [ ] Last-good data remains on screen if Firebase drops
- [ ] Production Vercel still on sheet until this list is done
- [ ] Sheet sharing is still public until the day **after** cut-over
- [ ] Then `mode: "firebase"`, `auth.required: true`, sheet made private

Rollback: set `mode` back to `"sheet"`, `auth.required` to `false`, `firebase.enabled` to `false`, redeploy. The sheet path is still in the code.

---

## 9. Frontend review — crash risks and what belongs in the backend

The UI is one HTML file on purpose. It can stay that way. These were the real risks; the crash-level ones are already hardened.

### Fixed so the page does not die

| Risk | What happened | What we did |
|---|---|---|
| Sheet timeout | A hung Google export froze Refresh | 12s abort + last data stays |
| Render throw | One bad chart/table stopped the page | `render()` and `loadData()` recover |
| Missing Chart.js / canvas | `new Chart(...)` crashed | Charts are skipped; KPIs/table still work |
| Missing DOM nodes | `getElementById` null | Guards on refresh, selects, table |
| Sheet text in HTML | Vendor names like `A & B` / pasted markup | `escapeHtml` on table cells |

### Still fine to leave in HTML

- Filters, theme, language, print, CSV export
- Chart drawing, capacity bars, ranking, forecast
- Date parsing (`parseSheetDate`) and facility merge `CAIID03+04`

These are presentation. Moving them does not make the site safer.

### Move to the backend at Firebase go-live

| Today in HTML | Move to | Why |
|---|---|---|
| Direct Google Sheet CSV URLs | Sync function | Sheet credential and ID must leave the browser |
| PapaParse + `normalizeRow` / `normalizeCapacityRow` | Sync function | One normalized snapshot, fewer client bugs |
| 30s `setInterval` + focus reload | Firestore `onSnapshot` | Realtime without quota burn |
| Public page, no login | Auth + rules + `auth.required` | Only employees |
| `FALLBACK_DATA` hardcoded in HTML | Last `inbound/live` cache | Smaller file, fresher fallback |
| Capacity fallback map | `inbound/live.capacity` | One source of truth |

### Do not move

- Chart.js rendering
- CSS / i18n / RTL
- Filter widgets

A second UI framework is not required.

### Remaining non-crash notes

- Full chart rebuild on every refresh can feel heavy on a phone. After Firebase, rebuild only when the snapshot hash changes.
- A very large sheet (thousands of rows) will make the table long. Cap or page it later in the HTML, or send a filtered snapshot from the function.
- CDN scripts (`papaparse`, `chart.js`) can fail offline. Fallback data and chart guards keep the page up.
- `login.html` is a shell. Wire Google sign-in there only in section 5, step 6.

---

## 10. Functions: what you need

| Function | Needed? | When |
|---|---|---|
| Sheet → `inbound/live` scheduled sync | Yes, one | Before cutting HTML to Firebase |
| Extra HTTP functions for KPIs | No | HTML can compute them |
| Chat / extra APIs | No | Removed on purpose |

No function is required for the site to stay live on the sheet today.

---

## 11. One-line operating rule

Keep production on the sheet until Firebase Auth, employee rules, and the single-document sync are proven on a preview URL. Then flip the switches once. If anything fails, flip them back. The HTML must never depend on a half-connected Firebase.
