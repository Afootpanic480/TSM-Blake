# Firebase Security Demo (Educational)

This is a **SECURITY DEMO**, not a production system.

Demonstrates:
- Server-side password hashing verification (Argon2id)
- Risk-based adaptive access control
- Explainable behavioral anomaly scoring
- Deny-by-default when server-issued context is missing

## What runs where

- Browser (untrusted): collects signals only (aggregate timings + velocity)
- Cloud Functions (trusted): verifies Firebase Auth context, verifies password hash, computes confidence score, decides allow/deny, writes audit log
- Realtime Database (trusted storage): stores password hashes + baselines (server-only), stores audit logs (server-only)

## Setup (high level)

1) Create a Firebase project
2) Enable **Anonymous Authentication** in Firebase Auth
3) Create a Realtime Database instance
4) Deploy rules from [database.rules.json](database.rules.json)
5) Put your Firebase web config into [public/app.js](public/app.js)
6) Deploy functions + hosting (`firebase deploy`)

## Hosting the frontend on GitHub Pages

If you host the static site on a non-Firebase domain (e.g. GitHub Pages / custom domain):

1) Add your domain to Firebase Auth:
  - Firebase Console → Authentication → Settings → Authorized domains
  - Add `tsm.ssnetwork.site` (and `www.tsm.ssnetwork.site` if you use it)

2) Configure the Functions allowed origin allow-list for CORS/context issuance:

```bash
firebase functions:config:set demo.allowed_origins="https://tsm.ssnetwork.site"
firebase deploy --only functions
```

3) Ensure the frontend calls the backend using an absolute URL:
  - See `API_BASE_URL` in [public/app.js](public/app.js)

## Seeding a demo user (optional helper)

The function `seedDemoUser` is provided **only for demo convenience**.

- Set an env secret:
  - `firebase functions:config:set demo.admin_secret="your-secret"`
  - OR set process env var `DEMO_ADMIN_SECRET` when running locally

- Call `POST /seedDemoUser` with header `X-Demo-Admin-Secret: your-secret` and JSON body:

```json
{
  "username": "demo",
  "password": "demo-pass",
  "baseline": {
    "typingAvgInterKeyMs": 220,
    "typingStdInterKeyMs": 80,
    "typingAvgHoldMs": 110,
    "typingStdHoldMs": 40,
    "mouseAvgSpeed": 900,
    "mouseStdSpeed": 400,
    "clickAvgIntervalMs": 600,
    "clickStdIntervalMs": 300
  }
}
```
