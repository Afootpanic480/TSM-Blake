// Firebase Configuration (please do not edit this or you'll break your entire app.)
  const firebaseConfig = {
    apiKey: "AIzaSyAaTXVp9ACFkg6kia8k4kamM4jUXQMacwk",
    authDomain: "school-messenger-e725b.firebaseapp.com",
    databaseURL: "https://school-messenger-e725b-default-rtdb.firebaseio.com",
    projectId: "school-messenger-e725b",
    storageBucket: "school-messenger-e725b.firebasestorage.app",
    messagingSenderId: "324751539319",
    appId: "1:324751539319:web:a843c4b4082beddb405a72",
    measurementId: "G-Q9XRQ8LCNQ"
  };

//set up a 2nd firebase config incase the 1st one fails cause of usage stuff
  const firebaseConfig2 = {
    apiKey: "AIzaSyCn2ekB2kzYuansPBhQSjZRLi9XcbyPCCY",
    authDomain: "school-messenger2.firebaseapp.com",
    projectId: "school-messenger2",
    storageBucket: "school-messenger2.firebasestorage.app",
    messagingSenderId: "813337604283",
    appId: "1:813337604283:web:e753bd1c77b90cec40b99e",
    measurementId: "G-Z8GL8E9S5H"
  };

// Initialize Firebase with automatic fallback support
const firebaseConfigs = [
  { name: 'primary', config: firebaseConfig },
  { name: 'secondary', config: firebaseConfig2 }
];

let app;
let auth;
let database;
let storage;
let activeConfigName = null;
const initErrors = [];

const duplicateAppRegex = /already exists|app\/.+exists/i;

for (const { name, config } of firebaseConfigs) {
  if (!config || !config.apiKey) {
    continue;
  }

  try {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(config);
    } else if (!app) {
      app = firebase.app();
      const currentConfig = app.options || {};
      if (currentConfig.apiKey && currentConfig.apiKey !== config.apiKey) {
        console.warn(`⚠️ Firebase default app already initialized with a different config. Using existing app instead of ${name}.`);
      }
    }

    auth = firebase.auth(app);
    database = firebase.database(app);
    storage = firebase.storage(app);

    activeConfigName = name;
    console.log(`✅ Firebase initialized using ${name} configuration`);
    break;
  } catch (error) {
    initErrors.push({ name, error });
    console.error(`❌ Firebase initialization error (${name}):`, error);

    // Handle duplicate app initialization separately to safely reuse the existing default app
    if (duplicateAppRegex.test(error?.message || '')) {
      try {
        app = firebase.app();
        auth = firebase.auth(app);
        database = firebase.database(app);
        storage = firebase.storage(app);
        activeConfigName = 'existing';
        console.warn('⚠️ Firebase default app already existed. Reusing existing app instance.');
        break;
      } catch (reuseError) {
        initErrors.push({ name: 'existing', error: reuseError });
        console.error('❌ Failed to reuse existing Firebase app instance:', reuseError);
      }
    }
  }
}

if (!app) {
    console.error('🚨 Unable to initialize Firebase with any provided configuration.', initErrors);
}

// Configure authentication persistence to avoid lingering sessions across refreshes
const configureAuthPersistence = () => {
  if (!auth || !(firebase?.auth?.Auth?.Persistence)) {
    return;
  }

  auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(() => {
      // Ensure any previously persisted session from older builds is cleared once on load
      if (typeof auth.signOut === 'function') {
        return auth.signOut().catch((signOutError) => {
          console.warn('⚠️ Firebase sign-out during persistence setup failed:', signOutError);
        });
      }
      return null;
    })
    .then(() => {
      console.log('🔐 Firebase auth persistence set to NONE (session cleared on refresh).');
    })
    .catch((persistenceError) => {
      console.warn('⚠️ Unable to set Firebase auth persistence to NONE:', persistenceError);
    });
};

configureAuthPersistence();

let skipUnloadSignOut = false;

const markSkipUnloadIfExternalTarget = (event) => {
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor) return;
  const href = anchor.getAttribute('href') || '';

  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    skipUnloadSignOut = true;
  }
};

document.addEventListener('click', markSkipUnloadIfExternalTarget, { capture: true });

// Attempt to sign out the user when the page is being unloaded (refresh/close)
const signOutOnUnload = (event) => {
  if (skipUnloadSignOut) {
    skipUnloadSignOut = false;
    return;
  }

  if (event?.type === 'pagehide' && event.persisted) {
    return;
  }

  try {
    const servicesAuth = window.firebaseServices?.auth;
    if (servicesAuth && typeof servicesAuth.signOut === 'function') {
      servicesAuth.signOut().catch(() => {});
      return;
    }

    if (auth && typeof auth.signOut === 'function') {
      auth.signOut().catch(() => {});
    }
  } catch (_) {}
};

window.addEventListener('pagehide', signOutOnUnload);
window.addEventListener('beforeunload', signOutOnUnload);

// Export Firebase instances and metadata
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseStorage = storage;
window.firebaseActiveConfig = activeConfigName;
window.firebaseInitErrors = initErrors;
