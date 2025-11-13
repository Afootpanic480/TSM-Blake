// Firebase Configuration for BLA-512 Encryptor
// To enable full Firebase functionality, add your Firebase project configuration below

/**
 * QUICK SETUP GUIDE:
 * ==================
 * 
 * 1. GO TO FIREBASE CONSOLE:
 *    https://console.firebase.google.com/
 * 
 * 2. CREATE NEW PROJECT (or select existing):
 *    - Click "Add project"
 *    - Enter project name (e.g., "BLA512-Encryptor")
 *    - Disable Google Analytics (optional)
 *    - Click "Create project"
 * 
 * 3. ADD WEB APP:
 *    - Click the </> icon (Web)
 *    - Register app nickname
 *    - Click "Register app"
 *    - Copy the firebaseConfig object
 * 
 * 4. ENABLE GOOGLE AUTHENTICATION:
 *    - In Firebase Console, go to "Authentication"
 *    - Click "Get started"
 *    - Click "Sign-in method" tab
 *    - Enable "Google" provider
 *    - Add your email as authorized domain if needed
 * 
 * 5. ENABLE REALTIME DATABASE (Optional):
 *    - Go to "Realtime Database"
 *    - Click "Create Database"
 *    - Start in test mode or use security rules below
 * 
 * 6. PASTE YOUR CONFIG BELOW:
 *    - Uncomment Option 2 below
 *    - Replace YOUR_XXX with actual values from Firebase Console
 * 
 * 7. AUTHORIZE YOUR DOMAIN:
 *    - In Firebase Console > Authentication > Settings
 *    - Add your domain to "Authorized domains"
 *    - For local testing, add: localhost
 * 
 * SECURITY RULES FOR REALTIME DATABASE:
 * {
 *   "rules": {
 *     "authTokens": {
 *       "$messageId": {
 *         ".read": true,
 *         ".write": true,
 *         ".indexOn": ["timestamp", "expiryTime"]
 *       }
 *     }
 *   }
 * }
 */

// Option 1: Set configuration via window object (recommended for security)
// You can set these in your HTML file or another secure location
window.__FIREBASE_API_KEY__ = window.__FIREBASE_API_KEY__ || '';
window.__FIREBASE_AUTH_DOMAIN__ = window.__FIREBASE_AUTH_DOMAIN__ || '';
window.__FIREBASE_PROJECT_ID__ = window.__FIREBASE_PROJECT_ID__ || '';
window.__FIREBASE_STORAGE_BUCKET__ = window.__FIREBASE_STORAGE_BUCKET__ || '';
window.__FIREBASE_MESSAGING_SENDER_ID__ = window.__FIREBASE_MESSAGING_SENDER_ID__ || '';
window.__FIREBASE_APP_ID__ = window.__FIREBASE_APP_ID__ || '';

// Option 2: Directly set configuration (UNCOMMENT THIS AND ADD YOUR CREDENTIALS)
// Replace YOUR_XXX with your actual Firebase credentials from Firebase Console
window.__FIREBASE_API_KEY__ = 'AIzaSyCbJmJgNV-Y66zTEg8hBr2luydz739xE7A';
window.__FIREBASE_AUTH_DOMAIN__ = 'encryptor-decryptor-1e110.firebaseapp.com';
window.__FIREBASE_PROJECT_ID__ = 'encryptor-decryptor-1e110';
window.__FIREBASE_STORAGE_BUCKET__ = 'encryptor-decryptor-1e110.firebasestorage.app';
window.__FIREBASE_MESSAGING_SENDER_ID__ = '203555496070';
window.__FIREBASE_APP_ID__ = '1:203555496070:web:103ba7f093200cbb4af107';

/**
 * EXAMPLE (DO NOT USE - GET YOUR OWN FROM FIREBASE CONSOLE):
 * 
 * window.__FIREBASE_API_KEY__ = 'AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
 * window.__FIREBASE_AUTH_DOMAIN__ = 'my-project-12345.firebaseapp.com';
 * window.__FIREBASE_PROJECT_ID__ = 'my-project-12345';
 * window.__FIREBASE_STORAGE_BUCKET__ = 'my-project-12345.appspot.com';
 * window.__FIREBASE_MESSAGING_SENDER_ID__ = '123456789012';
 * window.__FIREBASE_APP_ID__ = '1:123456789012:web:abcdef1234567890';
 */

// Initialize Firebase when configuration is available
if (typeof firebase !== 'undefined' && window.__FIREBASE_API_KEY__) {
    const firebaseConfig = {
        apiKey: window.__FIREBASE_API_KEY__,
        authDomain: window.__FIREBASE_AUTH_DOMAIN__,
        projectId: window.__FIREBASE_PROJECT_ID__,
        storageBucket: window.__FIREBASE_STORAGE_BUCKET__,
        messagingSenderId: window.__FIREBASE_MESSAGING_SENDER_ID__,
        appId: window.__FIREBASE_APP_ID__
    };

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('[Firebase] Initialized successfully');
        }
    } catch (error) {
        console.error('[Firebase] Initialization error:', error);
    }
}

/**
 * IMPORTANT NOTES:
 * 
 * 1. The tool will work WITHOUT Firebase configuration using local storage fallback
 * 2. For maximum security, configure Firebase to enable cloud-based validation
 * 3. Without Firebase, authentication tokens are stored locally only
 * 4. Firebase adds an extra layer of security by validating tokens server-side
 * 
 * SECURITY FEATURES WITH FIREBASE:
 * - Cloud-based token validation (prevents local tampering)
 * - Automatic token expiry
 * - Cross-device message verification
 * - Audit trail of encryption/decryption events
 * - Protection against message replay attacks
 */

// Firebase SDK will be loaded from CDN in Main.html
// Add this to your Main.html <head> section if not already present:
/*
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database.js"></script>
*/

console.log('[Firebase Config] Configuration loaded. Status:', 
    window.__FIREBASE_API_KEY__ ? 'Configured' : 'Using fallback mode'
);
