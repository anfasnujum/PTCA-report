# CathNote

Mobile-first PWA for writing a PTCA (coronary angioplasty) procedure note while the case is happening. Local-first, fully offline, no backend.

**Not a medical device — documentation aid only. Verify all entries before signing.**

## Run

```bash
npm install
npm run dev
```

- `npm test` — note-generation unit tests
- `npm run build` — production build with offline service worker

Install from the browser to the home screen. Data stays in IndexedDB on the device unless you export.
# PTCA-report
