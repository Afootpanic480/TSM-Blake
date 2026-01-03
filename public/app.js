// Client is untrusted: it collects signals only.
// No hashing, no allow/deny decisions here.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// TODO: paste your Firebase web config here.
const firebaseConfig = {
  apiKey: 'AIzaSyDC1VUNaRjoYeTzTQGMsFH-bo1JiLEHEBA',
  authDomain: 'sentinel-53b06.firebaseapp.com',
  projectId: 'sentinel-53b06',
  storageBucket: 'sentinel-53b06.firebasestorage.app',
  messagingSenderId: '11730646650',
  appId: '1:11730646650:web:1ceb3e884c843654326dc3',
  measurementId: 'G-Q06XQ5D3LX'
};

const out = document.getElementById('out');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const btnAuth = document.getElementById('btnAuth');
const btnReset = document.getElementById('btnReset');

// When hosting on GitHub Pages (or any non-Firebase domain), you must call the
// backend using an absolute URL (CORS will be enforced server-side).
// This can point to Firebase Hosting (recommended, uses rewrites):
//   https://<project-id>.web.app
// Or directly to the Cloud Functions domain.
const API_BASE_URL = 'https://sentinel-53b06.web.app';

function log(obj) {
  out.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

// --- Signal collection (aggregate-only) ---

const sessionStartTs = Date.now();

const typing = {
  lastKeyDownAt: null,
  downAtByKey: new Map(),
  interKeyDeltas: [],
  holdDeltas: [],
  keyCount: 0
};

const mouse = {
  lastAt: null,
  lastX: null,
  lastY: null,
  speeds: [],
  peakSpeed: 0
};

const clicks = {
  lastAt: null,
  intervals: [],
  count: 0
};

function resetSignals() {
  typing.lastKeyDownAt = null;
  typing.downAtByKey.clear();
  typing.interKeyDeltas = [];
  typing.holdDeltas = [];
  typing.keyCount = 0;

  mouse.lastAt = null;
  mouse.lastX = null;
  mouse.lastY = null;
  mouse.speeds = [];
  mouse.peakSpeed = 0;

  clicks.lastAt = null;
  clicks.intervals = [];
  clicks.count = 0;
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function signalsSnapshot() {
  const typingAvgInterKeyMs = avg(typing.interKeyDeltas);
  const typingAvgHoldMs = avg(typing.holdDeltas);

  const mouseAvgSpeed = avg(mouse.speeds);
  const mousePeakSpeed = mouse.peakSpeed || null;

  const clickAvgIntervalMs = avg(clicks.intervals);

  return {
    sessionStartTs,
    typingAvgInterKeyMs,
    typingAvgHoldMs,
    keyCount: typing.keyCount,
    mouseAvgSpeed,
    mousePeakSpeed,
    clickAvgIntervalMs,
    clickCount: clicks.count
  };
}

passwordEl.addEventListener('keydown', (e) => {
  const t = performance.now();

  // Inter-key timing: time between keydowns (no key codes sent to server).
  if (typing.lastKeyDownAt != null) {
    typing.interKeyDeltas.push(t - typing.lastKeyDownAt);
  }
  typing.lastKeyDownAt = t;

  // Hold timing uses keydown->keyup for the same key, but we never transmit the key.
  // We keep the key code only in memory to pair down/up events.
  typing.downAtByKey.set(e.code, t);
  typing.keyCount += 1;
});

passwordEl.addEventListener('keyup', (e) => {
  const t = performance.now();
  const downAt = typing.downAtByKey.get(e.code);
  if (downAt != null) {
    typing.holdDeltas.push(t - downAt);
    typing.downAtByKey.delete(e.code);
  }
});

window.addEventListener('mousemove', (e) => {
  const t = performance.now();
  if (mouse.lastAt != null) {
    const dt = t - mouse.lastAt;
    if (dt > 0) {
      // Velocity magnitude computed in memory; we never send positions.
      const dx = e.clientX - (mouse.lastX ?? e.clientX);
      const dy = e.clientY - (mouse.lastY ?? e.clientY);
      const dist = Math.hypot(dx, dy);
      const speed = (dist / dt) * 1000; // px/s
      mouse.speeds.push(speed);
      mouse.peakSpeed = Math.max(mouse.peakSpeed, speed);
    }
  }
  mouse.lastAt = t;
  mouse.lastX = e.clientX;
  mouse.lastY = e.clientY;
});

window.addEventListener('click', () => {
  const t = performance.now();
  if (clicks.lastAt != null) {
    clicks.intervals.push(t - clicks.lastAt);
  }
  clicks.lastAt = t;
  clicks.count += 1;
});

btnReset.addEventListener('click', () => {
  resetSignals();
  log({ ok: true, message: 'Signals reset', signals: signalsSnapshot() });
});

// --- Firebase Auth + server calls ---

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let idToken = null;
let serverContext = null; // { contextId, contextToken, expiresAtMs }

async function ensureSignedIn() {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}

async function refreshIdToken() {
  if (!auth.currentUser) return null;
  idToken = await auth.currentUser.getIdToken(/* forceRefresh */ true);
  return idToken;
}

async function issueContext() {
  await ensureSignedIn();
  await refreshIdToken();

  const resp = await fetch(`${API_BASE_URL}/issueContext`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({})
  });

  const data = await resp.json();
  serverContext = data;
  return data;
}

async function authWithRisk() {
  await ensureSignedIn();
  await refreshIdToken();

  if (!serverContext || Date.now() > serverContext.expiresAtMs) {
    await issueContext();
  }

  const payload = {
    username: usernameEl.value,
    password: passwordEl.value,
    signals: signalsSnapshot()
  };

  const resp = await fetch(`${API_BASE_URL}/authWithRisk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      // Server-issued context must be echoed back.
      'X-Demo-Context-Id': serverContext.contextId,
      'X-Demo-Context-Token': serverContext.contextToken
    },
    body: JSON.stringify(payload)
  });

  return await resp.json();
}

btnAuth.addEventListener('click', async () => {
  try {
    log('Calling server…');
    const result = await authWithRisk();
    log({ result, signals: signalsSnapshot() });
  } catch (e) {
    log({ error: String(e) });
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    log('Signing in anonymously…');
    await ensureSignedIn();
    return;
  }

  await refreshIdToken();
  log({
    ok: true,
    message: 'Ready. (Auth is anonymous; server makes allow/deny decisions.)',
    uid: user.uid
  });
});

resetSignals();
