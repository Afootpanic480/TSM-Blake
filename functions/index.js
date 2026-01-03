'use strict';

/**
 * SECURITY DEMO (educational)
 *
 * Goals demonstrated:
 * - Server-side password hashing verification (Argon2id)
 * - Risk-based adaptive access control (confidence threshold)
 * - Explainable behavioral anomaly scoring (simple, readable heuristics)
 * - Full denial when server-issued context is missing
 *
 * Important constraints:
 * - The browser is untrusted: it only collects signals and forwards them.
 * - NO password hashing or security decisions happen in client JS.
 * - Requests missing auth or required server context are denied.
 */

const crypto = require('crypto');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const argon2 = require('argon2');

admin.initializeApp();

const DB = admin.database();

const CONFIDENCE_THRESHOLD = 70; // >= 70 => allow
const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function nowMs() {
  return Date.now();
}

function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function sha256Base64(value) {
  return crypto.createHash('sha256').update(value).digest('base64');
}

function parseAllowedOrigins() {
  // Comma-separated list, e.g. "http://localhost:5000,https://yourproj.web.app"
  const raw =
    functions.config()?.demo?.allowed_origins ||
    process.env.ALLOWED_ORIGINS ||
    '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return list;
}

function isAllowedOrigin(origin) {
  // Hard deny file:// pages (Origin: "null") or missing Origin.
  if (!origin || origin === 'null') return false;

  const explicit = parseAllowedOrigins();
  if (explicit.length > 0) return explicit.includes(origin);

  // Demo default: allow Firebase Hosting domains, custom domain, and local emulator hosting.
  // NOTE: This is for the demo only. Production should use an explicit allow-list.
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.startsWith('http://127.0.0.1:')) return true;
  if (origin.endsWith('.web.app')) return true;
  if (origin.endsWith('.firebaseapp.com')) return true;
  if (origin === 'https://tsm.ssnetwork.site') return true;

  return false;
}

function setCors(res, origin) {
  // Minimal CORS: reflect allowed Origin; otherwise omit header.
  if (origin && isAllowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', [
      'Authorization',
      'Content-Type',
      'User-Agent',
      'X-Demo-Context-Id',
      'X-Demo-Context-Token'
    ].join(','));
    res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  }
}

function badRequest(res, origin, code, message) {
  setCors(res, origin);
  res.status(400).json({ error: code, message });
}

function unauthorized(res, origin, code, message) {
  setCors(res, origin);
  res.status(401).json({ error: code, message });
}

function forbidden(res, origin, code, message) {
  setCors(res, origin);
  res.status(403).json({ error: code, message });
}

async function verifyIdTokenFromAuthHeader(req) {
  const auth = req.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const idToken = match[1];
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

function requireJson(req) {
  const ct = (req.get('Content-Type') || '').toLowerCase();
  return ct.includes('application/json');
}

function requireHeader(req, name) {
  const value = req.get(name);
  if (!value) return null;
  return value;
}

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function scoreFromZ(z) {
  // Explainable mapping from deviation to similarity score.
  // Smaller z = closer to baseline.
  const az = Math.abs(z);
  if (az <= 1) return 1.0;
  if (az <= 2) return 0.7;
  if (az <= 3) return 0.4;
  return 0.1;
}

function safeNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function computeConfidenceAndReasons(baseline, observed) {
  /**
   * This is intentionally simple and explainable.
   * We compare a few aggregate features to a stored baseline.
   */

  const reasons = [];

  // Baseline defaults (avoid divide-by-zero; keep readable)
  const b = {
    typingAvgInterKeyMs: safeNumber(baseline?.typingAvgInterKeyMs) ?? 220,
    typingStdInterKeyMs: safeNumber(baseline?.typingStdInterKeyMs) ?? 80,
    typingAvgHoldMs: safeNumber(baseline?.typingAvgHoldMs) ?? 110,
    typingStdHoldMs: safeNumber(baseline?.typingStdHoldMs) ?? 40,

    mouseAvgSpeed: safeNumber(baseline?.mouseAvgSpeed) ?? 900,
    mouseStdSpeed: safeNumber(baseline?.mouseStdSpeed) ?? 400,

    clickAvgIntervalMs: safeNumber(baseline?.clickAvgIntervalMs) ?? 600,
    clickStdIntervalMs: safeNumber(baseline?.clickStdIntervalMs) ?? 300
  };

  const o = {
    typingAvgInterKeyMs: safeNumber(observed?.typingAvgInterKeyMs),
    typingAvgHoldMs: safeNumber(observed?.typingAvgHoldMs),
    keyCount: safeNumber(observed?.keyCount),

    mouseAvgSpeed: safeNumber(observed?.mouseAvgSpeed),
    mousePeakSpeed: safeNumber(observed?.mousePeakSpeed),

    clickAvgIntervalMs: safeNumber(observed?.clickAvgIntervalMs),
    clickCount: safeNumber(observed?.clickCount),

    sessionStartTs: safeNumber(observed?.sessionStartTs)
  };

  // Hard checks for missing/low-quality signals: reduce confidence.
  let qualityPenalty = 0;
  if (!o.sessionStartTs) {
    reasons.push('missing_session_start');
    qualityPenalty += 0.15;
  }
  if (!o.keyCount || o.keyCount < 4) {
    reasons.push('low_typing_samples');
    qualityPenalty += 0.2;
  }
  if (!o.clickCount || o.clickCount < 1) {
    reasons.push('low_click_samples');
    qualityPenalty += 0.1;
  }
  if (!o.mouseAvgSpeed) {
    reasons.push('missing_mouse_signal');
    qualityPenalty += 0.1;
  }

  // z-scores for deviation from baseline (where present)
  const zInterKey = o.typingAvgInterKeyMs != null
    ? (o.typingAvgInterKeyMs - b.typingAvgInterKeyMs) / Math.max(1, b.typingStdInterKeyMs)
    : null;
  const zHold = o.typingAvgHoldMs != null
    ? (o.typingAvgHoldMs - b.typingAvgHoldMs) / Math.max(1, b.typingStdHoldMs)
    : null;
  const zMouse = o.mouseAvgSpeed != null
    ? (o.mouseAvgSpeed - b.mouseAvgSpeed) / Math.max(1, b.mouseStdSpeed)
    : null;
  const zClick = o.clickAvgIntervalMs != null
    ? (o.clickAvgIntervalMs - b.clickAvgIntervalMs) / Math.max(1, b.clickStdIntervalMs)
    : null;

  const parts = [];

  if (zInterKey != null) {
    const s = scoreFromZ(zInterKey);
    parts.push({ name: 'typing_interkey', weight: 0.35, score: s, z: zInterKey });
    if (Math.abs(zInterKey) > 2) reasons.push('typing_interkey_deviation');
  }

  if (zHold != null) {
    const s = scoreFromZ(zHold);
    parts.push({ name: 'typing_hold', weight: 0.25, score: s, z: zHold });
    if (Math.abs(zHold) > 2) reasons.push('typing_hold_deviation');
  }

  if (zMouse != null) {
    const s = scoreFromZ(zMouse);
    parts.push({ name: 'mouse_speed', weight: 0.2, score: s, z: zMouse });
    if (Math.abs(zMouse) > 2) reasons.push('mouse_speed_deviation');
  }

  if (zClick != null) {
    const s = scoreFromZ(zClick);
    parts.push({ name: 'click_interval', weight: 0.2, score: s, z: zClick });
    if (Math.abs(zClick) > 2) reasons.push('click_interval_deviation');
  }

  const totalWeight = parts.reduce((acc, p) => acc + p.weight, 0) || 1;
  const weighted = parts.reduce((acc, p) => acc + p.weight * p.score, 0) / totalWeight;

  // Apply a transparent, bounded penalty for low signal quality.
  const confidence01 = clamp01(weighted * (1 - clamp01(qualityPenalty)));
  const confidenceScore = Math.round(confidence01 * 100);

  return { confidenceScore, reasons, debugParts: parts };
}

async function writeAuditLog(uid, record) {
  // Server-side only. DB rules deny all client reads/writes.
  const ref = DB.ref(`auditLogs/${uid}`).push();
  await ref.set({
    ...record,
    createdAtMs: nowMs()
  });
}

/**
 * issueContext
 *
 * Creates a short-lived server-issued context for this user.
 * The client MUST attach this context on the subsequent auth request.
 *
 * If the browser runs a local file (Origin: null) or omits Origin,
 * we deny by refusing to issue context.
 */
exports.issueContext = functions.https.onRequest(async (req, res) => {
  const origin = req.get('Origin');
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    // Preflight.
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (!isAllowedOrigin(origin)) {
    return forbidden(res, origin, 'origin_not_allowed', 'Missing or disallowed Origin.');
  }

  // Verify Firebase Auth context exists.
  const decoded = await verifyIdTokenFromAuthHeader(req);
  if (!decoded?.uid) {
    return unauthorized(res, origin, 'missing_or_invalid_auth', 'Missing/invalid Firebase ID token.');
  }

  const userAgent = requireHeader(req, 'User-Agent');
  if (!userAgent) {
    return badRequest(res, origin, 'missing_user_agent', 'User-Agent header required.');
  }

  const contextId = randomId(12);
  const contextToken = randomId(24); // secret; must be echoed by client later.

  const context = {
    uid: decoded.uid,
    origin,
    userAgentHash: sha256Base64(userAgent),
    createdAtMs: nowMs(),
    expiresAtMs: nowMs() + CONTEXT_TTL_MS
  };

  await DB.ref(`context/${decoded.uid}/${contextId}`).set({
    ...context,
    contextTokenHash: sha256Base64(contextToken)
  });

  // Return only what the client needs to present back.
  return res.status(200).json({ contextId, contextToken, expiresAtMs: context.expiresAtMs });
});

/**
 * authWithRisk
 *
 * Verifies password server-side (Argon2id) and computes a behavioral confidence score.
 * If the server-issued context is missing/invalid/expired: FULL DENY.
 *
 * Response contract (per requirements):
 *   { allow: boolean, confidenceScore: number }
 */
exports.authWithRisk = functions.https.onRequest(async (req, res) => {
  const origin = req.get('Origin');
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Reject missing required headers and contexts early.
  if (!isAllowedOrigin(origin)) {
    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  if (!requireJson(req)) {
    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  const userAgent = requireHeader(req, 'User-Agent');
  const contextId = requireHeader(req, 'X-Demo-Context-Id');
  const contextToken = requireHeader(req, 'X-Demo-Context-Token');

  if (!userAgent || !contextId || !contextToken) {
    // Requirement: full denial when server-issued context is missing.
    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  // Verify Firebase Auth context exists.
  const decoded = await verifyIdTokenFromAuthHeader(req);
  if (!decoded?.uid) {
    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  // Load and validate server-issued context.
  const ctxSnap = await DB.ref(`context/${decoded.uid}/${contextId}`).get();
  const ctx = ctxSnap.exists() ? ctxSnap.val() : null;

  const ctxValid =
    ctx &&
    ctx.uid === decoded.uid &&
    ctx.origin === origin &&
    ctx.userAgentHash === sha256Base64(userAgent) &&
    ctx.expiresAtMs &&
    nowMs() <= ctx.expiresAtMs &&
    ctx.contextTokenHash === sha256Base64(contextToken);

  if (!ctxValid) {
    await writeAuditLog(decoded.uid, {
      allow: false,
      confidenceScore: 0,
      reasons: ['missing_or_invalid_context'],
      origin,
      userAgentHash: sha256Base64(userAgent)
    });

    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  const body = req.body || {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const signals = body.signals || {};

  if (!username || !password) {
    await writeAuditLog(decoded.uid, {
      allow: false,
      confidenceScore: 0,
      reasons: ['missing_credentials'],
      origin,
      username
    });

    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  // Look up user record.
  const userSnap = await DB.ref(`users/${username}`).get();
  const user = userSnap.exists() ? userSnap.val() : null;

  if (!user?.passwordHash) {
    await writeAuditLog(decoded.uid, {
      allow: false,
      confidenceScore: 0,
      reasons: ['unknown_user'],
      origin,
      username
    });

    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  // Server-side password verification (Argon2id).
  let passwordOk = false;
  try {
    passwordOk = await argon2.verify(user.passwordHash, password);
  } catch {
    passwordOk = false;
  }

  if (!passwordOk) {
    await writeAuditLog(decoded.uid, {
      allow: false,
      confidenceScore: 0,
      reasons: ['bad_password'],
      origin,
      username
    });

    return res.status(200).json({ allow: false, confidenceScore: 0 });
  }

  // Compute explainable confidence score based on behavioral deviation.
  const { confidenceScore, reasons, debugParts } = computeConfidenceAndReasons(
    user.baseline || {},
    signals || {}
  );

  const allow = confidenceScore >= CONFIDENCE_THRESHOLD;

  await writeAuditLog(decoded.uid, {
    allow,
    confidenceScore,
    reasons,
    origin,
    username,
    // Note: we log only aggregates, not raw keystrokes or mouse positions.
    observedSignals: {
      typingAvgInterKeyMs: signals?.typingAvgInterKeyMs ?? null,
      typingAvgHoldMs: signals?.typingAvgHoldMs ?? null,
      keyCount: signals?.keyCount ?? null,
      mouseAvgSpeed: signals?.mouseAvgSpeed ?? null,
      mousePeakSpeed: signals?.mousePeakSpeed ?? null,
      clickAvgIntervalMs: signals?.clickAvgIntervalMs ?? null,
      clickCount: signals?.clickCount ?? null,
      sessionStartTs: signals?.sessionStartTs ?? null
    },
    scoringBreakdown: debugParts
  });

  // One-time-use context: delete after auth attempt (forces re-issuance).
  await DB.ref(`context/${decoded.uid}/${contextId}`).remove();

  // Required response: allow + confidenceScore only.
  return res.status(200).json({ allow, confidenceScore });
});

/**
 * seedDemoUser (optional helper for the SECURITY DEMO)
 *
 * Creates/overwrites a demo user record:
 *   users/<username>/{ passwordHash, baseline }
 *
 * SECURITY NOTE: This is intentionally gated by an env secret and should not
 * be exposed in real apps. It's included only to make the demo self-contained.
 */
exports.seedDemoUser = functions.https.onRequest(async (req, res) => {
  const origin = req.get('Origin');
  setCors(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  if (!requireJson(req)) {
    return badRequest(res, origin, 'bad_content_type', 'Expected application/json');
  }

  const secret = req.get('X-Demo-Admin-Secret') || '';
  const configuredSecret = functions.config()?.demo?.admin_secret || process.env.DEMO_ADMIN_SECRET;
  if (!configuredSecret || secret !== configuredSecret) {
    return forbidden(res, origin, 'forbidden', 'Missing/invalid demo admin secret');
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const baseline = req.body?.baseline || {};

  if (!username || !password) {
    return badRequest(res, origin, 'missing_fields', 'username and password required');
  }

  // Server-side hashing (Argon2id).
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 19456,
    parallelism: 1
  });

  await DB.ref(`users/${username}`).set({
    passwordHash,
    baseline
  });

  return res.status(200).json({ ok: true });
});
